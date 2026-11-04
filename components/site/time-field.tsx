"use client";

import { SelectField } from "@/components/site/select-field";

const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? "00" : "30";
  const suffix = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
});

/** Pickup time as a styled list of half-hour slots (replaces the native time box). */
export function TimeField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectField
      id={id}
      value={value}
      options={SLOTS}
      onChange={onChange}
      placeholder="Select time"
    />
  );
}
