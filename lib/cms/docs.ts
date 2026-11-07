import { ICON_OPTIONS } from "@/lib/cms/icons";
import type { DocDefinition, Field } from "@/lib/cms/types";

/** Schemas for every editable part of the website (drives the admin forms and server validation). */

const faqItemFields: Field[] = [
  { type: "text", key: "question", label: "Question", required: true, max: 200 },
  { type: "textarea", key: "answer", label: "Answer", required: true, max: 1500, rows: 4 },
];

export const DOCS: DocDefinition[] = [
  {
    key: "site_info",
    label: "Contact & business",
    description: "Phone numbers, email, address and social links shown across the website, footer and emails.",
    viewPath: "/contact",
    fields: [
      { type: "text", key: "name", label: "Business name", required: true, max: 80 },
      { type: "text", key: "shortName", label: "Short name", required: true, max: 30 },
      { type: "text", key: "tagline", label: "Tagline", max: 80 },
      {
        type: "group",
        key: "primaryPhone",
        label: "Primary phone",
        fields: [
          { type: "text", key: "display", label: "Shown as", required: true, max: 30, placeholder: "+91 96968 88585" },
          { type: "text", key: "raw", label: "Digits only (for the call link)", required: true, max: 15, placeholder: "9696888585" },
        ],
      },
      {
        type: "group",
        key: "secondaryPhone",
        label: "Secondary phone",
        fields: [
          { type: "text", key: "display", label: "Shown as", max: 30 },
          { type: "text", key: "raw", label: "Digits only", max: 15 },
        ],
      },
      { type: "text", key: "whatsapp", label: "WhatsApp number (with country code, digits only)", required: true, max: 15, placeholder: "919696888585" },
      { type: "text", key: "email", label: "Email", required: true, max: 120 },
      {
        type: "group",
        key: "address",
        label: "Address",
        fields: [
          { type: "text", key: "line1", label: "Line 1", required: true, max: 120 },
          { type: "text", key: "line2", label: "Line 2", required: true, max: 120 },
        ],
      },
      { type: "text", key: "hours", label: "Opening hours", max: 80 },
      { type: "text", key: "gstin", label: "GSTIN (printed on invoices)", max: 15, hint: "Leave empty if you are not GST registered." },
      { type: "text", key: "mapQuery", label: "Map search text", max: 200, hint: "Used to find your shop on Google Maps." },
      { type: "link", key: "mapEmbedSrc", label: "Google Maps embed link (optional)", hint: "Google Maps > Share > Embed a map > copy the src link." },
      { type: "link", key: "mapShareUrl", label: "Google Maps share link (optional)" },
      { type: "link", key: "facebook", label: "Facebook page link" },
      { type: "link", key: "instagram", label: "Instagram page link" },
    ],
  },
  {
    key: "home",
    label: "Home page",
    description: "Announcement bar, the hero heading and the strips and lists on the home page.",
    viewPath: "/",
    fields: [
      {
        type: "group",
        key: "announcement",
        label: "Announcement bar (top of every page)",
        fields: [
          { type: "toggle", key: "enabled", label: "Show the announcement bar" },
          { type: "text", key: "text", label: "Message", max: 160, placeholder: "Festival offer: 10% off outstation trips" },
          { type: "text", key: "linkLabel", label: "Link text (optional)", max: 40 },
          { type: "link", key: "linkHref", label: "Link address (optional)" },
        ],
      },
      {
        type: "group",
        key: "hero",
        label: "Hero (top of the home page)",
        fields: [
          { type: "text", key: "kicker", label: "Small line above the heading", max: 80 },
          { type: "text", key: "line1", label: "Heading line 1", required: true, max: 40 },
          { type: "text", key: "line2", label: "Heading line 2", max: 40 },
          { type: "text", key: "highlight", label: "Highlighted last word(s)", required: true, max: 40 },
          { type: "textarea", key: "subtitle", label: "Sub-heading", max: 300, rows: 3 },
          { type: "strings", key: "badges", label: "Three small badges under the heading", max: 40, maxItems: 3 },
          { type: "text", key: "primaryCta", label: "Main button text", required: true, max: 30 },
          { type: "text", key: "note", label: "Small note under the buttons", max: 120 },
          {
            type: "list",
            key: "slides",
            label: "Hero photos (slideshow)",
            itemTitle: "alt",
            itemImage: "desktopImage",
            maxItems: 6,
            addLabel: "Add photo",
            fields: [
              { type: "image", key: "desktopImage", label: "Laptop / desktop photo", aspect: "16:9", hint: "Wide landscape, ratio 16:9. Ideal size 1920 x 1080 px (at least 1600 x 900)." },
              { type: "image", key: "mobileImage", label: "Phone photo (optional)", aspect: "9:16", hint: "Tall portrait, ratio 9:16. Ideal size 1080 x 1920 px (at least 940 x 1670). A 4:5 photo also works, but it sits lower on the screen with empty space above. Leave empty to use the laptop photo on phones too." },
              { type: "text", key: "alt", label: "Describe the photo", max: 140, hint: "Read aloud by screen readers and shown if the photo cannot load." },
            ],
          },
        ],
      },
      {
        type: "list",
        key: "assurances",
        label: "Trust points",
        itemTitle: "title",
        maxItems: 8,
        addLabel: "Add trust point",
        fields: [
          { type: "select", key: "icon", label: "Icon", options: ICON_OPTIONS },
          { type: "text", key: "title", label: "Title", required: true, max: 60 },
          { type: "text", key: "text", label: "Short text", max: 120 },
        ],
      },
      { type: "strings", key: "marquee", label: "Scrolling strip words", max: 60, maxItems: 14 },
      { type: "strings", key: "popularSearches", label: "Popular searches", max: 60, maxItems: 12 },
    ],
  },
  {
    key: "fleet",
    label: "Fleet",
    description: "Your vehicles. The name must match the vehicle type used in Routes & fares.",
    viewPath: "/rate-card",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Vehicles",
        itemTitle: "title",
        itemSubtitle: "seats",
        itemImage: "image",
        maxItems: 20,
        addLabel: "Add vehicle",
        fields: [
          { type: "text", key: "title", label: "Name", required: true, max: 40, hint: "Changing a name here does not rename it in existing fares: update Routes & fares too." },
          { type: "text", key: "seats", label: "Seats shown to customers", max: 40, placeholder: "4 passengers" },
          { type: "number", key: "capacity", label: "Maximum passengers", min: 1, max: 60, step: 1, defaultValue: 4 },
          { type: "text", key: "luggage", label: "Luggage", max: 40 },
          { type: "textarea", key: "description", label: "Description", max: 300, rows: 3 },
          { type: "select", key: "icon", label: "Icon", options: ICON_OPTIONS },
          { type: "image", key: "image", label: "Photo (optional)", hint: "Leave empty to use the built-in photo." },
          { type: "text", key: "photo", label: "Built-in photo name", max: 60, hidden: true },
          { type: "toggle", key: "active", label: "Show this vehicle on the website", defaultValue: true },
        ],
      },
    ],
  },
  {
    key: "features",
    label: "Why choose us",
    description: "The six reasons to book with you.",
    viewPath: "/",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Points",
        itemTitle: "title",
        maxItems: 12,
        addLabel: "Add point",
        fields: [
          { type: "select", key: "icon", label: "Icon", options: ICON_OPTIONS },
          { type: "text", key: "title", label: "Title", required: true, max: 60 },
          { type: "textarea", key: "text", label: "Text", max: 240, rows: 2 },
        ],
      },
    ],
  },
  {
    key: "faqs",
    label: "FAQs",
    description: "Questions shown on the home page.",
    viewPath: "/#faqs",
    fields: [
      { type: "list", key: "items", label: "Questions", itemTitle: "question", maxItems: 40, addLabel: "Add question", fields: faqItemFields },
    ],
  },
  {
    key: "destinations",
    label: "Destinations",
    description: "Places people travel to from Pune. Each one gets its own page.",
    viewPath: "/destinations",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Destinations",
        itemTitle: "name",
        itemSubtitle: "distance",
        itemImage: "image",
        maxItems: 120,
        addLabel: "Add destination",
        fields: [
          { type: "text", key: "name", label: "Name", required: true, max: 80 },
          { type: "text", key: "slug", label: "Page address (slug)", required: true, max: 80, hint: "Lowercase letters, numbers and dashes, e.g. lonavala-khandala. Changing it changes the page URL." },
          {
            type: "select",
            key: "category",
            label: "Category",
            options: [
              { value: "hill-station", label: "Hill station" },
              { value: "temple", label: "Temple & pilgrimage" },
              { value: "beach", label: "Beach" },
              { value: "city", label: "City & attraction" },
            ],
          },
          { type: "text", key: "distance", label: "Distance from Pune", max: 40, placeholder: "~65 km" },
          { type: "text", key: "duration", label: "Drive time", max: 40, placeholder: "1.5–2 hrs" },
          { type: "text", key: "bestTime", label: "Best time to visit", max: 200 },
          { type: "text", key: "tagline", label: "Tagline", max: 160 },
          { type: "textarea", key: "intro", label: "Introduction", max: 1500, rows: 5 },
          { type: "strings", key: "highlights", label: "Highlights", max: 200, maxItems: 20 },
          { type: "strings", key: "tips", label: "Travel tips", max: 240, maxItems: 20 },
          { type: "image", key: "image", label: "Photo (optional)", hint: "Leave empty to use the default scenic photo." },
        ],
      },
    ],
  },
  {
    key: "areas",
    label: "Pune areas",
    description: "Neighbourhoods you serve. Each one gets its own page.",
    viewPath: "/areas",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Areas",
        itemTitle: "name",
        itemSubtitle: "slug",
        maxItems: 80,
        addLabel: "Add area",
        fields: [
          { type: "text", key: "name", label: "Name", required: true, max: 80 },
          { type: "text", key: "slug", label: "Page address (slug)", required: true, max: 80 },
          { type: "strings", key: "landmarks", label: "Landmarks", max: 80, maxItems: 12 },
          { type: "textarea", key: "blurb", label: "Description", max: 800, rows: 4 },
        ],
      },
    ],
  },
  {
    key: "services",
    label: "Services",
    description: "Your service pages: local hire, airport transfer, outstation and so on.",
    viewPath: "/services",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Services",
        itemTitle: "title",
        itemSubtitle: "tag",
        maxItems: 30,
        addLabel: "Add service",
        fields: [
          { type: "text", key: "title", label: "Title", required: true, max: 80 },
          { type: "text", key: "slug", label: "Page address (slug)", required: true, max: 80 },
          { type: "text", key: "tag", label: "Small tag", max: 40 },
          { type: "text", key: "tagline", label: "Tagline", max: 160 },
          { type: "textarea", key: "summary", label: "Summary (shown in lists)", max: 400, rows: 3 },
          { type: "strings", key: "intro", label: "Introduction paragraphs", max: 900, maxItems: 6, multiline: true },
          { type: "strings", key: "whatYouGet", label: "What you get", max: 200, maxItems: 14 },
          { type: "strings", key: "idealFor", label: "Ideal for", max: 200, maxItems: 14 },
          { type: "list", key: "faqs", label: "Questions on this page", itemTitle: "question", maxItems: 20, addLabel: "Add question", fields: faqItemFields },
          {
            type: "select",
            key: "bookingTripType",
            label: "Booking form: trip type",
            options: [
              { value: "One Way", label: "One way" },
              { value: "Round Trip", label: "Round trip" },
              { value: "Airport Transfer", label: "Airport transfer" },
              { value: "Local Rental", label: "Local rental" },
            ],
          },
          { type: "text", key: "bookingDrop", label: "Booking form: destination (optional)", max: 120 },
          { type: "text", key: "bookingNotes", label: "Booking form: note", max: 200 },
        ],
      },
    ],
  },
  {
    key: "payment_methods",
    label: "Payment methods",
    description: "Ways customers can pay, shown on the Payment Options page.",
    viewPath: "/payment-options",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Methods",
        itemTitle: "title",
        maxItems: 10,
        addLabel: "Add method",
        fields: [
          { type: "text", key: "title", label: "Name", required: true, max: 40 },
          { type: "textarea", key: "text", label: "Description", max: 300, rows: 3 },
        ],
      },
    ],
  },
  {
    key: "rate_card",
    label: "Rate card",
    description: "Indicative per-vehicle rates shown on the Rate Card page. Leave a rate empty to show 'On request'.",
    viewPath: "/rate-card",
    fields: [
      {
        type: "list",
        key: "items",
        label: "Vehicles",
        itemTitle: "vehicle",
        itemSubtitle: "seats",
        maxItems: 20,
        addLabel: "Add vehicle",
        fields: [
          { type: "text", key: "vehicle", label: "Vehicle (same as the Fleet name)", required: true, max: 40 },
          { type: "text", key: "seats", label: "Seats", max: 40 },
          { type: "text", key: "local", label: "Local city hire", max: 60, placeholder: "₹12 / km" },
          { type: "text", key: "outstation", label: "Outstation", max: 60 },
          { type: "text", key: "airport", label: "Airport transfer", max: 60 },
        ],
      },
    ],
  },
  {
    key: "seo",
    label: "SEO",
    description: "How the website appears in Google and when shared.",
    viewPath: "/",
    fields: [
      { type: "text", key: "title", label: "Default page title", required: true, max: 120 },
      { type: "textarea", key: "description", label: "Default description", required: true, max: 300, rows: 3 },
      { type: "strings", key: "keywords", label: "Keywords", max: 60, maxItems: 30 },
      { type: "image", key: "shareImage", label: "Share image (optional)", hint: "Shown when the link is shared on WhatsApp or social media." },
    ],
  },
];

export const DOC_KEYS = DOCS.map((doc) => doc.key);

export function getDocDefinition(key: string): DocDefinition | undefined {
  return DOCS.find((doc) => doc.key === key);
}
