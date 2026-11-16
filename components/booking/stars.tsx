import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Read-only star row. Works in server and client components. */
export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", value >= n - 0.25 ? "fill-amber-400 text-amber-400" : "text-white/25")} aria-hidden="true" />
      ))}
    </span>
  );
}

/** The small "4.3/5" badge used on cab cards. */
export function RatingBadge({ avg, count }: { avg: number; count: number }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white" title={`${count} ${count === 1 ? "review" : "reviews"}`}>
      {avg.toFixed(1)}/5 <span className="font-normal opacity-80">({count})</span>
    </span>
  );
}
