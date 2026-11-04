"use client";

import { Check, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type SelectFieldProps = {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  /** Optional small icon shown beside each option. */
  optionIcons?: Record<string, LucideIcon>;
  fallbackIcon?: LucideIcon;
  /** Shown when `value` is empty. */
  placeholder?: string;
  /** "dark" for forms on a dark background; popup and trigger follow. */
  tone?: "light" | "dark";
};

/**
 * Accessible custom dropdown (listbox pattern) that replaces the browser's
 * native <select> popup, which cannot be styled and gets clipped by cards.
 * Works with mouse, touch and keyboard (arrows, Home/End, Enter, Escape).
 */
export function SelectField({
  id,
  value,
  options,
  onChange,
  optionIcons,
  fallbackIcon,
  placeholder,
  tone = "light",
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = Math.max(0, options.indexOf(value));

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (index: number) => {
    onChange(options[index]);
    setOpen(false);
  };

  // Close when clicking or tapping outside
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the highlighted option visible
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openList();
        else setActive((current) => Math.min(options.length - 1, current + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openList();
        else setActive((current) => Math.max(0, current - 1));
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(options.length - 1);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) choose(active);
        else openList();
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div className={`sf${tone === "dark" ? " sf-dark" : ""}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        className={`sf-trigger${open ? " is-open" : ""}${value ? "" : " is-empty"}`}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="sf-value">{value || placeholder}</span>
        <ChevronDown className="sf-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <ul
          className="sf-panel"
          id={`${id}-list`}
          role="listbox"
          ref={listRef}
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const Icon = optionIcons?.[option] ?? fallbackIcon;
            const selected = option === value;
            return (
              <li
                key={option}
                id={`${id}-opt-${index}`}
                data-index={index}
                role="option"
                aria-selected={selected}
                className={`sf-option${index === active ? " is-active" : ""}${
                  selected ? " is-selected" : ""
                }`}
                onMouseEnter={() => setActive(index)}
                // keep keyboard focus on the trigger while clicking an option
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                {Icon ? (
                  <span className="sf-option-icon">
                    <Icon aria-hidden="true" />
                  </span>
                ) : null}
                <span className="sf-option-label">{option}</span>
                {selected ? <Check className="sf-check" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
