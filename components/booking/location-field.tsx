"use client";

import { MapPin, Plane } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { suggestPlaces } from "@/lib/booking/places";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The owner's own places (airports): suggested first, marked with a plane. */
  airports?: string[];
  /** The owner's other places (Pune areas, landmarks, route cities): suggested when the online lookup has nothing or is down. */
  places?: string[];
  placeholder?: string;
  /** Address suggestions while typing (free OpenStreetMap lookup, or Google when a key is set). */
  suggest?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  required?: boolean;
};

type Item = { label: string; airport: boolean };

/** A text box for a place. Type any address, or pick a suggestion. Used for From / To and pickup / drop. */
export function LocationField({ id, value, onChange, airports = [], places = [], placeholder, suggest = true, readOnly, maxLength = 160, required }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const needle = value.trim().toLowerCase();
  const local: Item[] = airports
    .filter((name) => !needle || name.toLowerCase().includes(needle))
    .slice(0, 5)
    .map((label) => ({ label, airport: true }));
  const wantsRemote = suggest && !readOnly && open && needle.length >= 3;
  const remoteItems = (wantsRemote ? remote : []).filter((label) => !local.some((item) => item.label.toLowerCase() === label.toLowerCase()));
  // while the online lookup is loading, empty or down, the owner's own places fill in
  const ownPlaces =
    remoteItems.length === 0 && needle.length >= 2
      ? places.filter((place) => place.toLowerCase().includes(needle) && !local.some((item) => item.label === place)).slice(0, 6)
      : [];
  const items: Item[] = [...local, ...remoteItems.map((label) => ({ label, airport: false })), ...ownPlaces.map((label) => ({ label, airport: false }))];

  // Google suggestions, debounced
  useEffect(() => {
    if (!wantsRemote) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void suggestPlaces(value).then((found) => {
        if (!cancelled) setRemote(found);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, wantsRemote]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (item: Item) => {
    onChange(item.label);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(items.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="sf" ref={rootRef}>
      <input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        readOnly={readOnly}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
      />
      {open && !readOnly && items.length > 0 ? (
        <ul className="sf-panel" id={`${id}-list`} role="listbox">
          {items.map((item, index) => (
            <li
              key={item.label}
              role="option"
              aria-selected={index === active}
              className={`sf-option${index === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(item)}
            >
              <span className="sf-option-icon">{item.airport ? <Plane aria-hidden="true" /> : <MapPin aria-hidden="true" />}</span>
              <span className="sf-option-label">{item.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
