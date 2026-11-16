"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Clock3,
  Landmark,
  Mountain,
  Route,
  Search,
  SearchX,
  Waves,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { openBooking } from "@/components/site/booking";

export type ExplorerItem = {
  slug: string;
  name: string;
  category: string;
  distance: string;
  duration: string;
  bestTime: string;
  tagline: string;
  /** Optional photo in /public/destinations. */
  photo?: string;
  /** False when the photo is a generic category image, not the actual place. */
  photoIsOfPlace?: boolean;
};

export type ExplorerCategory = {
  id: string;
  label: string;
  plural: string;
};

const icons: Record<string, LucideIcon> = {
  "hill-station": Mountain,
  temple: Landmark,
  beach: Waves,
  city: Building2,
};

/** "June to September for waterfalls; ..." -> "June to September" */
function shortSeason(text: string) {
  return text.split(/;| for | with |, | \(/)[0].trim();
}

export function DestinationsExplorer({
  items,
  categories,
}: {
  items: ExplorerItem[];
  categories: ExplorerCategory[];
}) {
  const [active, setActive] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) map[item.category] = (map[item.category] ?? 0) + 1;
    return map;
  }, [items]);

  const needle = query.trim().toLowerCase();
  const visible = items.filter((item) => {
    if (active !== "all" && item.category !== active) return false;
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      item.tagline.toLowerCase().includes(needle)
    );
  });

  const labelOf = (id: string) =>
    categories.find((category) => category.id === id)?.label ?? "";

  return (
    <div className="dx">
      <div className="dx-toolbar">
        <div className="dx-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Lonavala, Shirdi, Goa…"
            aria-label="Search destinations"
          />
          {query ? (
            <button
              type="button"
              className="dx-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="dx-chips" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={`dx-chip${active === "all" ? " is-active" : ""}`}
            aria-pressed={active === "all"}
            onClick={() => setActive("all")}
          >
            All
            <small>{items.length}</small>
          </button>
          {categories.map((category) => {
            const Icon = icons[category.id] ?? Route;
            const on = active === category.id;
            return (
              <button
                type="button"
                key={category.id}
                className={`dx-chip${on ? " is-active" : ""}`}
                aria-pressed={on}
                onClick={() => setActive(category.id)}
              >
                <Icon aria-hidden="true" />
                {category.plural}
                <small>{counts[category.id] ?? 0}</small>
              </button>
            );
          })}
        </div>
      </div>

      <p className="dx-status" aria-live="polite">
        Showing <b>{visible.length}</b> of {items.length} destinations from Pune
      </p>

      <div className="dx-grid">
        {visible.map((item, index) => {
          const Icon = icons[item.category] ?? Route;
          return (
            <Link
              key={item.slug}
              href={`/destinations/${item.slug}`}
              className={`dx-card dx-${item.category}`}
              style={{ "--i": Math.min(index, 8) } as CSSProperties}
            >
              <div className={`dx-banner${item.photo ? " has-photo" : ""}`}>
                {item.photo ? (
                  <img
                    className="dx-photo"
                    src={item.photo}
                    alt={item.photoIsOfPlace ? item.name : ""}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <Icon className="dx-banner-icon" aria-hidden="true" />
                )}
                <span className="dx-badge">{labelOf(item.category)}</span>
                <span className="dx-dist">
                  <Route aria-hidden="true" />
                  {item.distance}
                </span>
              </div>
              <div className="dx-body">
                <h3>{item.name}</h3>
                <p>{item.tagline}</p>
                <ul className="dx-facts">
                  <li>
                    <Route aria-hidden="true" />
                    {item.distance}
                  </li>
                  <li>
                    <Clock3 aria-hidden="true" />
                    {item.duration}
                  </li>
                  <li title={`Best time: ${item.bestTime}`}>
                    <CalendarDays aria-hidden="true" />
                    {shortSeason(item.bestTime)}
                  </li>
                </ul>
                <span className="dx-cta">
                  <small>From Pune</small>
                  <span>
                    View trip
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </span>
              </div>
            </Link>
          );
        })}

        {visible.length === 0 ? (
          <div className="dx-empty">
            <SearchX aria-hidden="true" />
            <h3>No destination matches “{query}”</h3>
            <p>
              We drive well beyond this list. Tell us where you want to go and
              we will quote it clearly.
            </p>
            <button
              type="button"
              className="btn btn-gold"
              onClick={() =>
                openBooking({ enquiry: true, drop: query, notes: "Enquiry for a destination not on the list" })
              }
            >
              Ask about {query || "another place"}
              <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
