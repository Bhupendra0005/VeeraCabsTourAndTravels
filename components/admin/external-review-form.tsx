"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/form-parts";
import { ImageChooser } from "@/components/admin/document-editor";
import { DatePicker, SelectMenu } from "@/components/admin/pickers";
import { Card, Field, inputClass } from "@/components/admin/ui";
import { ReviewAvatar } from "@/components/site/review-avatar";
import { idle, type ActionState } from "@/lib/admin/action-state";
import { EXTERNAL_SOURCES } from "@/lib/booking/reviews";
import { addExternalReviewAction } from "@/lib/server/admin/actions/reviews";

/** Today in India, as yyyy-mm-dd. */
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

const blank = () => ({ name: "", source: "google", rating: "5", date: today(), comment: "" });

export function ExternalReviewForm() {
  // controlled fields: a form action resets plain inputs, which would wipe the form when a check fails
  const [v, setV] = useState(blank);
  const [avatar, setAvatar] = useState("");
  // after a review was added the form is ready for the next one; when a check fails everything typed stays
  const [state, action] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await addExternalReviewAction(previous, formData);
    if (result.ok) {
      setV(blank());
      setAvatar("");
    }
    return result;
  }, idle);
  const bind = (key: keyof typeof v) => ({
    value: v[key],
    onChange: (e: { target: { value: string } }) => setV((current) => ({ ...current, [key]: e.target.value })),
  });

  return (
    <form action={action}>
      <Card
        title="Add a review from another site"
        description="Add only reviews that a real customer wrote (Google Maps, Justdial, Facebook or a WhatsApp message). Copy the text and rating exactly as written. The website always shows where the review came from."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reviewer's name" htmlFor="xr-name" hint="Shown as first name and last initial, e.g. Shikha B.">
            <input id="xr-name" name="name" required maxLength={60} autoComplete="off" className={inputClass} {...bind("name")} />
          </Field>
          <Field label="Where was it written?" htmlFor="xr-source">
            <SelectMenu
              id="xr-source"
              name="source"
              size="lg"
              value={v.source}
              onChange={(source) => setV((current) => ({ ...current, source }))}
              options={Object.entries(EXTERNAL_SOURCES).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Rating" htmlFor="xr-rating">
            <SelectMenu
              id="xr-rating"
              name="rating"
              size="lg"
              value={v.rating}
              onChange={(rating) => setV((current) => ({ ...current, rating }))}
              options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "star" : "stars"}` }))}
            />
          </Field>
          <Field label="Date of the review" htmlFor="xr-date">
            <DatePicker id="xr-date" name="date" size="lg" max={today()} value={v.date} onChange={(date) => setV((current) => ({ ...current, date }))} />
          </Field>
          <div className="grid gap-3 sm:col-span-2">
            <ImageChooser
              label="Reviewer's photo (optional)"
              hint="Pick or upload the photo from the media library. Without a photo, the website shows the initials of the name."
              value={avatar}
              onChange={setAvatar}
            />
            <input type="hidden" name="avatar" value={avatar} />
            <p className="flex items-center gap-3 text-xs text-muted">
              <ReviewAvatar
                name={v.name || "Name"}
                url={avatar}
                className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-sky-500/15 text-sm font-extrabold text-sky-300 [&>img]:size-full [&>img]:object-cover"
              />
              This is how the picture will look on the website.
            </p>
          </div>
          <Field label="Review text" htmlFor="xr-comment" hint={`${v.comment.length}/600`} className="sm:col-span-2">
            <textarea id="xr-comment" name="comment" rows={4} required maxLength={600} className={inputClass} {...bind("comment")} />
          </Field>
        </div>
        <FormMessage state={state} />
        <div className="mt-4">
          <SubmitButton pendingText="Adding...">
            <Plus aria-hidden="true" /> Add review
          </SubmitButton>
        </div>
      </Card>
    </form>
  );
}
