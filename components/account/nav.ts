import type { AccountNavGroup } from "@/components/account/account-shell";

export type TripTab = "upcoming" | "completed" | "cancelled" | "all";

export const TRIP_TAB_LABEL: Record<TripTab, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  all: "All trips",
};

const tabHref = (id: TripTab) => (id === "upcoming" ? "/bookings" : `/bookings?tab=${id}`);

/** Sidebar menu shared by every signed-in customer page. */
export function accountGroups({
  current,
  tab,
  counts,
}: {
  current: "trips" | "profile";
  tab?: TripTab;
  counts?: Record<TripTab, number>;
}): AccountNavGroup[] {
  return [
    {
      title: "My trips",
      items: (Object.keys(TRIP_TAB_LABEL) as TripTab[]).map((id) => ({
        href: tabHref(id),
        label: TRIP_TAB_LABEL[id],
        icon: id,
        count: counts?.[id],
        active: current === "trips" && id === tab,
      })),
    },
    {
      title: "Account",
      items: [{ href: "/profile", label: "My profile", icon: "profile", active: current === "profile" }],
    },
    {
      title: "More",
      items: [
        { href: "/book", label: "Book a new ride", icon: "book" },
        { href: "/cancellation-policy", label: "Cancellation policy", icon: "policy" },
        { href: "/payment-options", label: "Payment options", icon: "payments" },
        { href: "/terms", label: "Terms & conditions", icon: "terms" },
      ],
    },
  ];
}
