"use client";

import { MapPin, Plane } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { suggestPlacesDetailed } from "@/lib/booking/places";

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
  /** Shown under the box when a longer address has no match on the map (so the customer knows nothing is wrong). */
  unmappedHint?: string;
};

/** `kept`: words the customer typed that the map did not know; they stay in front of the chosen place. */
type Item = { label: string; airport: boolean; kept?: string };

/** "Dibai, Debai, Uttar Pradesh" -> the place on top, the area below it. */
function splitLabel(label: string): { name: string; area: string } {
  const at = label.indexOf(",");
  return at === -1 ? { name: label, area: "" } : { name: label.slice(0, at).trim(), area: label.slice(at + 1).trim() };
}

/** Bold the part of the name the customer already typed. */
function highlight(text: string, typed: string): ReactNode {
  const needle = typed.trim().toLowerCase();
  const at = needle.length >= 2 ? text.toLowerCase().indexOf(needle) : -1;
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <b>{text.slice(at, at + needle.length)}</b>
      {text.slice(at + needle.length)}
    </>
  );
}

/** A text box for a place. Type any address, or pick a suggestion. Used for From / To and pickup / drop. */
export function LocationField({ id, value, onChange, airports = [], places = [], placeholder, suggest = true, readOnly, maxLength = 160, required, unmappedHint }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<string[]>([]);
  /** The text the last online lookup was answered for. */
  const [answered, setAnswered] = useState("");
  const [kept, setKept] = useState("");
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
  // `kept` only belongs to the answer for the text that is in the box right now
  const partial = answered === value ? kept : "";
  const items: Item[] = [...local, ...remoteItems.map((label) => ({ label, airport: false, kept: partial })), ...ownPlaces.map((label) => ({ label, airport: false }))];

  // a lookup is on its way and there is nothing to show yet: say so instead of an empty gap
  const searching = wantsRemote && answered !== value && items.length === 0 && needle.length >= 3;
  const unmapped = !!unmappedHint && wantsRemote && answered === value && remote.length === 0 && items.length === 0 && needle.length >= 8;

  // Google suggestions, debounced
  useEffect(() => {
    if (!wantsRemote) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void suggestPlacesDetailed(value).then((found) => {
        if (!cancelled) {
          setRemote(found.items);
          setKept(found.kept);
          setAnswered(value);
        }
      });
    }, 400);
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
    onChange(item.kept ? `${item.kept}, ${item.label}` : item.label);
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
        <ul className="sf-panel sf-places" id={`${id}-list`} role="listbox">
          {partial && remoteItems.length > 0 ? (
            <li role="presentation" className="sf-places-note">
              Exact address not found. Pick the nearest place: your words ({partial}) stay in front of it.
            </li>
          ) : null}
          {items.map((item, index) => {
            const { name, area } = splitLabel(item.label);
            const sub = item.airport ? (area ? `Airport · ${area}` : "Airport") : area;
            return (
              <li
                key={item.label}
                role="option"
                aria-selected={index === active}
                title={item.label}
                className={`sf-option${index === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                <span className="sf-option-icon">{item.airport ? <Plane aria-hidden="true" /> : <MapPin aria-hidden="true" />}</span>
                <span className="sf-option-label">
                  <span className="sf-place-name">{highlight(name, value)}</span>
                  {sub ? <span className="sf-place-sub">{sub}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !readOnly && searching ? (
        <div className="sf-panel sf-places sf-hint" role="status">
          <p>Searching places...</p>
        </div>
      ) : null}
      {open && !readOnly && unmapped ? (
        <div className="sf-panel sf-places sf-hint" role="status">
          <p>{unmappedHint}</p>
        </div>
      ) : null}
    </div>
  );
}
