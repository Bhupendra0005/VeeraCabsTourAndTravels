/**
 * Declarative description of an editable document. The same schema drives the admin form
 * (client) and the server-side validation, so what the form allows is exactly what is accepted.
 */

type Base = { key: string; label: string; hint?: string; required?: boolean; /** Kept in the data but not shown in the form. */ hidden?: boolean; /** Value for a newly added list item. */ defaultValue?: string | number | boolean };

export type TextField = Base & { type: "text"; max?: number; placeholder?: string; /** Show a live character count and the length that works best, e.g. [30, 60]. */ ideal?: [number, number]; /** Phone-style box: only digits can be typed. */ digits?: boolean; /** Capital letters only (codes such as a GSTIN). */ upper?: boolean };
export type TextareaField = Base & { type: "textarea"; max?: number; rows?: number; /** Show a live character count and the length that works best, e.g. [70, 160]. */ ideal?: [number, number] };
export type NumberField = Base & { type: "number"; min: number; max: number; step?: number };
export type ToggleField = Base & { type: "toggle" };
export type SelectField = Base & { type: "select"; options: { value: string; label: string }[] };
/** An image: a /public path or an ImageKit URL. */
export type ImageField = Base & {
  type: "image";
  /** Ratio the photo should have, as "16:9". The admin shows its preview in this shape. */
  aspect?: `${number}:${number}`;
  /** "contain" previews the whole photo (vehicles, logos); "cover" (default) fills the box and crops. */
  fit?: "cover" | "contain";
};
/** A link: https://, tel:, mailto: or a site path starting with "/". */
export type LinkField = Base & { type: "link"; max?: number };
/** A list of short texts (highlights, tips, bullet points). */
export type StringsField = Base & { type: "strings"; max?: number; maxItems?: number; multiline?: boolean };
export type GroupField = Base & { type: "group"; fields: Field[] };
export type ListField = Base & {
  type: "list";
  fields: Field[];
  /** Which sub-field names an item in the collapsed list. */
  itemTitle: string;
  /** Sub-field shown as a small line under the title. */
  itemSubtitle?: string;
  /** Number sub-fields shown as small chips in the collapsed row, e.g. the fare ("₹900") or the distance ("25 km"). A zero or empty value is not shown. */
  itemMeta?: { key: string; prefix?: string; suffix?: string }[];
  /** Show the first letter of the title in a coloured tile before the row, when the item has no photo or icon. */
  itemInitial?: boolean;
  /** "cards" shows the items as a grid of photo cards instead of rows (best for lists with a photo). */
  layout?: "rows" | "cards";
  /** In the card layout: "contain" shows the whole photo (vehicles), "cover" fills the box and crops (scenery). Default "cover". */
  imageFit?: "cover" | "contain";
  /** Fill the page address (slug) from the name while the owner types it, until the owner changes the address by hand. */
  slugFrom?: { slug: string; from: string };
  /** A website address for the item's own page, with the sub-field in braces, e.g. "/services/{slug}". Adds a "view live page" button to the row. */
  itemHref?: string;
  /** Icon sub-field (an icon picker) shown as an icon tile before the title when the item has no photo. */
  itemIcon?: string;
  /** Split an opened item into titled blocks: each block lists the keys of its fields. Fields not named here come last. */
  sections?: { title: string; keys: string[] }[];
  /** Image sub-field shown as a thumbnail before the title. */
  itemImage?: string;
  maxItems?: number;
  addLabel?: string;
};

export type Field =
  | TextField
  | TextareaField
  | NumberField
  | ToggleField
  | SelectField
  | ImageField
  | LinkField
  | StringsField
  | GroupField
  | ListField;

export type DocDefinition = {
  key: string;
  label: string;
  description: string;
  fields: Field[];
  /** Where the visitor sees the result, for a "View on site" link. */
  viewPath?: string;
};

export type DocValue = Record<string, unknown>;
