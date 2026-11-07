"use client";

import { Layers } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { SelectMenu, type SelectOption } from "@/components/admin/pickers";

/** A dropdown that filters the page by putting its choice in the URL (?<param>=value). */
export function UrlSelect({ id, param, value, options, className }: { id: string; param: string; value: string; options: readonly SelectOption[]; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  return (
    <SelectMenu
      id={id}
      value={value}
      icon={<Layers />}
      options={options}
      disabled={pending}
      className={className}
      onChange={(next) => start(() => router.push(next ? `${pathname}?${param}=${encodeURIComponent(next)}` : pathname))}
    />
  );
}
