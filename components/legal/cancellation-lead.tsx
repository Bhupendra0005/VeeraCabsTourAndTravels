import { ArrowRight, CalendarCheck, CircleCheck, CircleX, Plane } from "lucide-react";
import type { RefundBand } from "@/lib/booking/refund";

/**
 * The cancellation rule at a glance. `free` reads like "1 hour". With partial-refund steps (`bands` has more than
 * the usual full / none pair) it shows one card per refund level instead of the simple timeline.
 */
export function CancellationLead({ free, bands }: { free: string; bands?: RefundBand[] }) {
  const stepped = !!bands && bands.length > 2;
  return (
    <section aria-label="Cancellation at a glance" className="grid gap-5 rounded-3xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24]/90 to-panel p-5 shadow-[0_0_44px_-22px_rgba(0,150,219,0.6)] sm:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#22d3ee]">At a glance</p>
        <h2 className="mt-1 font-(family-name:--font-display) text-2xl font-extrabold sm:text-3xl">
          {stepped ? (
            <>
              The earlier you cancel, the <span className="text-[#22d3ee]">more you get back</span>
            </>
          ) : (
            <>
              Cancel free until <span className="text-[#22d3ee]">{free}</span> before pickup
            </>
          )}
        </h2>
      </div>

      {stepped ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bands.map((band) => {
            const tone = band.percent === 100 ? "emerald" : band.percent === 0 ? "red" : "amber";
            const box = tone === "emerald" ? "border-emerald-400/25 bg-emerald-400/8" : tone === "red" ? "border-red-400/25 bg-red-400/8" : "border-amber-400/25 bg-amber-400/8";
            const text = tone === "emerald" ? "text-emerald-300" : tone === "red" ? "text-red-300" : "text-amber-300";
            return (
              <div key={`${band.percent}-${band.text}`} className={`rounded-2xl border p-5 ${box}`}>
                <p className={`flex items-center gap-2.5 text-sm font-bold ${text}`}>
                  {band.percent === 0 ? <CircleX className="size-5" aria-hidden="true" /> : <CircleCheck className="size-5" aria-hidden="true" />}
                  {band.percent === 100 ? "Full refund" : band.percent === 0 ? "No refund" : "Partial refund"}
                </p>
                <p className="mt-3 font-(family-name:--font-display) text-3xl font-extrabold">{band.percent === 0 ? "No refund" : `${band.percent}% refund`}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{band.text}.</p>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* timeline: booked -> free cancellation window -> cut-off -> departure */}
          <div className="grid gap-3" role="img" aria-label={`You can cancel for a full refund until ${free} before departure. After that no refund is given.`}>
            <div className="flex h-4 overflow-hidden rounded-full bg-white/8">
              <div className="grow basis-3/4 rounded-l-full bg-linear-to-r from-emerald-500 to-emerald-300 shadow-[0_0_20px_-4px_rgba(52,211,153,0.8)]" />
              <div className="grow basis-1/4 rounded-r-full bg-linear-to-r from-red-500 to-red-400" />
            </div>
            <div className="grid grid-cols-[3fr_1fr] gap-2 text-xs font-semibold sm:text-sm">
              <span className="flex items-center gap-2 text-emerald-300">
                <CalendarCheck className="size-4 shrink-0" aria-hidden="true" /> Booking confirmed
                <ArrowRight className="size-3.5 text-white/30" aria-hidden="true" />
                <span className="text-white/60">full refund</span>
              </span>
              <span className="flex items-center justify-end gap-2 text-right text-red-300">
                <span className="text-white/60">no refund</span> <Plane className="size-4 shrink-0" aria-hidden="true" /> Pickup
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-5">
              <p className="flex items-center gap-2.5 text-sm font-bold text-emerald-300">
                <CircleCheck className="size-5" aria-hidden="true" /> Cancel in time
              </p>
              <p className="mt-3 font-(family-name:--font-display) text-3xl font-extrabold">100% refund</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                If you cancel up to {free} before departure, everything you paid goes back to your original payment method, usually in 5 to 7 working days.
              </p>
            </div>
            <div className="rounded-2xl border border-red-400/25 bg-red-400/8 p-5">
              <p className="flex items-center gap-2.5 text-sm font-bold text-red-300">
                <CircleX className="size-5" aria-hidden="true" /> Cancel late
              </p>
              <p className="mt-3 font-(family-name:--font-display) text-3xl font-extrabold">No refund</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/70">Less than {free} before departure, a 100% penalty applies and no refund is given.</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
