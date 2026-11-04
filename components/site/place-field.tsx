"use client";

import { MapPin } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export type PlaceOption = { label: string; hint?: string };

type PlaceFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: PlaceOption[];
  placeholder?: string;
  invalid?: boolean;
};

/**
 * Text input with a styled suggestion list. The visitor can pick a suggestion
 * or simply type any location; suggestions only narrow down as they type.
 */
export function PlaceField({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: PlaceFieldProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const needle = value.trim().toLowerCase();
  const matches = (
    needle
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(needle) ||
            option.hint?.toLowerCase().includes(needle),
        )
      : options
  ).slice(0, 8);

  const showList = open && matches.length > 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (label: string) => {
    onChange(label);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!showList) setOpen(true);
      setActive((current) => Math.min(matches.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(-1, current - 1));
    } else if (event.key === "Enter" && showList && active >= 0) {
      // pick the highlighted suggestion instead of submitting the form
      event.preventDefault();
      choose(matches[active].label);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="pf" ref={rootRef}>
      <input
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && active >= 0 ? `${id}-opt-${active}` : undefined
        }
        aria-invalid={invalid || undefined}
      />

      {showList ? (
        <ul className="sf-panel pf-panel" id={`${id}-list`} role="listbox" ref={listRef}>
          {matches.map((option, index) => (
            <li
              key={option.label}
              id={`${id}-opt-${index}`}
              data-index={index}
              role="option"
              aria-selected={index === active}
              className={`sf-option${index === active ? " is-active" : ""}`}
              onMouseEnter={() => setActive(index)}
              // keep focus in the input while clicking a suggestion
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option.label)}
            >
              <span className="sf-option-icon">
                <MapPin aria-hidden="true" />
              </span>
              <span className="sf-option-label">
                {option.label}
                {option.hint ? <small>{option.hint}</small> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
