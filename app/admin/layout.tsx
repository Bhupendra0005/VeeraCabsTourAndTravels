import type { Metadata } from "next";
import type { ReactNode } from "react";

// The admin area must never be indexed or cached by a shared cache.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Veera Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
