/**
 * Declarative description of an editable document. The same schema drives the admin form
 * (client) and the server-side validation, so what the form allows is exactly what is accepted.
 */

type Base = { key: string; label: string; hint?: string; required?: boolean; /** Kept in the data but not shown in the form. */ hidden?: boolean; /** Value for a newly added list item. */ defaultValue?: string | number | boolean };

export type TextField = Base & { type: "text"; max?: number; placeholder?: string };
export type TextareaField = Base & { type: "textarea"; max?: number; rows?: number };
export type NumberField = Base & { type: "number"; min: number; max: number; step?: number };
export type ToggleField = Base & { type: "toggle" };
export type SelectField = Base & { type: "select"; options: { value: string; label: string }[] };
/** An image: a /public path or an ImageKit URL. */
export type ImageField = Base & {
  type: "image";
  /** Ratio the photo should have, as "16:9". The admin shows its preview in this shape. */
  aspect?: `${number}:${number}`;
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
