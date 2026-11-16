"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RATING_WORDS } from "@/lib/booking/reviews";
import { postJson } from "@/lib/payments/checkout-client";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="grid gap-1.5 border-0 p-0">
      <legend className="mb-1 text-sm font-semibold">{label}</legend>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            className="rounded p-0.5 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-bright"
            onClick={() => onChange(n)}
          >
            <Star className={cn("size-8", value >= n ? "fill-amber-400 text-amber-400" : "text-white/30")} aria-hidden="true" />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted">{value ? RATING_WORDS[value] : "Tap to rate"}</span>
      </div>
    </fieldset>
  );
}

/** "Rate your trip": cab rating, driver rating, quick tags and a comment. Shown on a trip that has taken place. */
export function RateTripForm({ bookingId, vehicle, tagOptions }: { bookingId: string; vehicle: string; tagOptions: string[] }) {
  const router = useRouter();
  const [cab, setCab] = useState(0);
  const [driver, setDriver] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!cab || !driver) return setError("Please rate both the cab and the driver.");
    setBusy(true);
    setError("");
    try {
      await postJson(`/api/bookings/${bookingId}/review`, { cabRating: cab, driverRating: driver, tags, comment: comment.trim() });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className={cn(ui.card, "grid gap-4")} onSubmit={submit} noValidate>
      <div>
        <h2 className={ui.cardTitle}>Rate your trip</h2>
        <p className={ui.muted}>How was your {vehicle}? Your review helps other travellers choose.</p>
      </div>
      <StarPicker label="Cab Rating" value={cab} onChange={setCab} />
      <StarPicker label="Driver Rating" value={driver} onChange={setDriver} />

      {tagOptions.length > 0 ? (
      <fieldset className="grid gap-2 border-0 p-0">
        <legend className="mb-1 text-sm font-semibold">What went well? (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition", on ? "border-brand bg-brand/15 font-semibold" : "border-line text-muted hover:border-brand")}
                onClick={() => setTags((current) => (on ? current.filter((item) => item !== tag) : [...current, tag]))}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </fieldset>
      ) : null}

      <div className="field field-full">
        <label htmlFor="rt-comment">Tell us more (optional)</label>
        <textarea id="rt-comment" rows={3} maxLength={600} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience with the cab and the driver" />
      </div>

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-gold justify-self-start" disabled={busy}>
        {busy ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
