import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import QRCode from "qrcode";
import {
  LineCapStyle,
  PDFDocument,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { LOGO_ASPECT, LOGO_PNG_BASE64 } from "@/lib/server/bookings/logo-data";
import { LOGO_MARK_ASPECT, LOGO_MARK_WHITE_PNG_BASE64, VEHICLE_PHOTOS_PNG_BASE64 } from "@/lib/server/bookings/ticket-assets";
import { ICON_NODES } from "@/lib/server/bookings/ticket-icons";
import type { DocumentLayout, Palette } from "@/lib/booking/document-layout";
import type { SiteData } from "@/lib/site";

/**
 * Drawing kit shared by the ticket and the invoice. The designs are laid out on a 1052 x 1495 grid
 * (A4 proportions); `u()` / `X()` convert that grid to PDF points so the layout can be tuned in design units.
 */

export const W = 595.28;
export const H = 841.89;
export const S = H / 1495;
export const OX = (W - 1052 * S) / 2;
export const u = (value: number) => value * S;
/** Font size from a design size (Helvetica is wider than the reference font, so sizes are scaled down a little). */
export const fs = (value: number) => value * S * 0.86;
export const X = (value: number) => OX + value * S;

const BASE_C = {
  page: rgb(0.957, 0.973, 0.992),
  card: rgb(1, 1, 1),
  cardBorder: rgb(0.835, 0.9, 0.965),
  tint: rgb(0.925, 0.96, 0.99),
  tintStrong: rgb(0.86, 0.925, 0.985),
  blue: rgb(0.1, 0.46, 0.88),
  blueDeep: rgb(0.04, 0.23, 0.52),
  blueMid: rgb(0.055, 0.36, 0.75),
  navy: rgb(0.04, 0.16, 0.4),
  ink: rgb(0.08, 0.13, 0.21),
  muted: rgb(0.37, 0.43, 0.52),
  white: rgb(1, 1, 1),
  green: rgb(0.08, 0.5, 0.24),
  greenBg: rgb(0.865, 0.953, 0.894),
  amber: rgb(0.7, 0.33, 0.04),
  amberBg: rgb(0.992, 0.937, 0.784),
  amberBorder: rgb(0.965, 0.835, 0.557),
  red: rgb(0.75, 0.15, 0.15),
  redBg: rgb(0.99, 0.9, 0.89),
  blueBg: rgb(0.86, 0.925, 0.99),
  // header waves, footer band and the ticket's route card (follow the accent colour)
  wave1: rgb(0.86, 0.92, 0.985),
  wave2: rgb(0.93, 0.965, 0.995),
  footTop: rgb(0.05, 0.31, 0.65),
  footAccent: rgb(0.36, 0.64, 0.94),
  footBottom: rgb(0.03, 0.15, 0.4),
  footBar: rgb(0.02, 0.12, 0.33),
  routeA: rgb(0.07, 0.4, 0.8),
  routeB: rgb(0.04, 0.22, 0.52),
  routeText: rgb(0.78, 0.88, 1),
};

type Colors = typeof BASE_C;

/** The accent palette for the document being drawn. Scoped per request, so concurrent PDFs never mix colours. */
const themeStore = new AsyncLocalStorage<Partial<Colors>>();

export const C: Colors = new Proxy(BASE_C, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    const themed = themeStore.getStore();
    const key = prop as keyof Colors;
    return themed && key in themed ? themed[key] : target[key];
  },
});

/** Runs `fn` with the document colours switched to `palette` (null keeps the built-in blue). */
export function withPalette<T>(palette: Palette | null, fn: () => Promise<T>): Promise<T> {
  if (!palette) return fn();
  const colors: Partial<Colors> = {};
  for (const [key, [r, g, b]] of Object.entries(palette)) colors[key as keyof Palette] = rgb(r, g, b);
  return themeStore.run(colors, fn);
}

const PHOTO_KEYS: [string, string][] = [["tempo", "fleet-tempo"], ["mpv", "fleet-mpv"], ["suv", "fleet-suv"], ["sedan", "fleet-sedan"]];

/** Built-in vehicle photo for a booked vehicle name (matched loosely), or the sedan as a safe default. */
export function vehiclePhotoFor(vehicleType: string): string {
  const name = vehicleType.toLowerCase();
  return PHOTO_KEYS.find(([word]) => name.includes(word))?.[1] ?? "fleet-sedan";
}

export type Tone = "green" | "amber" | "red" | "blue";

/** The built-in PDF fonts only cover Latin-1, so user text is made safe before it is drawn. */
export function safe(value: string): string {
  return value.replace(/₹/g, "Rs ").replace(/[^\x20-\x7E -ÿ]/g, "?");
}

export function money(paise: number): string {
  const rupees = paise / 100;
  return `Rs ${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function istDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

type TextOptions = { size?: number; bold?: boolean; color?: RGB; align?: "left" | "right" | "center"; tracking?: number };
type BoxOptions = { fill?: RGB; stroke?: RGB; radius?: number; width?: number; opacity?: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number) => rgb(lerp(a.red, b.red, t), lerp(a.green, b.green, t), lerp(a.blue, b.blue, t));

/** Converts one Lucide shape (path / circle / rect / line / polyline ...) into SVG path data. */
function shapeToPath(tag: string, a: Record<string, string>): string {
  const n = (key: string) => Number(a[key] ?? 0);
  switch (tag) {
    case "path":
      return a.d ?? "";
    case "circle": {
      const [cx, cy, r] = [n("cx"), n("cy"), n("r")];
      return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
    }
    case "ellipse": {
      const [cx, cy, rx, ry] = [n("cx"), n("cy"), n("rx"), n("ry")];
      return `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0 Z`;
    }
    case "rect": {
      const [x, y, w, h] = [n("x"), n("y"), n("width"), n("height")];
      const r = Math.min(n("rx") || n("ry") || 0, w / 2, h / 2);
      return r
        ? `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
        : `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    }
    case "line":
      return `M ${n("x1")} ${n("y1")} L ${n("x2")} ${n("y2")}`;
    case "polyline":
    case "polygon": {
      const pts = (a.points ?? "").trim().split(/[\s,]+/).map(Number);
      let d = "";
      for (let i = 0; i + 1 < pts.length; i += 2) d += `${i === 0 ? "M" : "L"} ${pts[i]} ${pts[i + 1]} `;
      return tag === "polygon" ? `${d}Z` : d;
    }
    default:
      return "";
  }
}

/** Small drawing toolkit. Every vertical position is measured from the TOP of the page. */
export class Canvas {
  constructor(
    readonly doc: PDFDocument,
    readonly page: PDFPage,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {}

  measure(value: string, size: number, bold = false, tracking = 0): number {
    const text = safe(value);
    return (bold ? this.bold : this.regular).widthOfTextAtSize(text, size) + tracking * Math.max(0, text.length - 1);
  }

  text(value: string, x: number, baseline: number, o: TextOptions = {}): number {
    const size = o.size ?? 10;
    const text = safe(value);
    const font = o.bold ? this.bold : this.regular;
    const tracking = o.tracking ?? 0;
    const width = this.measure(text, size, o.bold, tracking);
    const left = o.align === "right" ? x - width : o.align === "center" ? x - width / 2 : x;
    const color = o.color ?? C.ink;
    if (!tracking) {
      this.page.drawText(text, { x: left, y: H - baseline, size, font, color });
    } else {
      let cursor = left;
      for (const char of text) {
        this.page.drawText(char, { x: cursor, y: H - baseline, size, font, color });
        cursor += font.widthOfTextAtSize(char, size) + tracking;
      }
    }
    return width;
  }

  /** Greedy word wrap that also breaks very long words, so nothing is ever cut off. */
  wrap(value: string, maxWidth: number, size: number, bold = false): string[] {
    const lines: string[] = [];
    let line = "";
    for (const raw of safe(value).split(/\s+/).filter(Boolean)) {
      let word = raw;
      while (this.measure(word, size, bold) > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && this.measure(word.slice(0, cut), size, bold) > maxWidth) cut -= 1;
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && this.measure(next, size, bold) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  /** Draws wrapped text and returns the baseline for whatever comes next. */
  paragraph(value: string, x: number, baseline: number, maxWidth: number, o: TextOptions & { lineHeight?: number } = {}): number {
    const size = o.size ?? 10;
    const lineHeight = o.lineHeight ?? size * 1.4;
    let y = baseline;
    for (const line of this.wrap(value, maxWidth, size, o.bold)) {
      this.text(line, x, y, { ...o, size });
      y += lineHeight;
    }
    return y;
  }

  box(x: number, top: number, width: number, height: number, o: BoxOptions) {
    const strokeWidth = o.stroke ? (o.width ?? 0.8) : 0;
    if (o.radius) {
      const r = Math.min(o.radius, width / 2, height / 2);
      const d = `M ${r} 0 H ${width - r} Q ${width} 0 ${width} ${r} V ${height - r} Q ${width} ${height} ${width - r} ${height} H ${r} Q 0 ${height} 0 ${height - r} V ${r} Q 0 0 ${r} 0 Z`;
      this.page.drawSvgPath(d, { x, y: H - top, color: o.fill, borderColor: o.stroke, borderWidth: strokeWidth, opacity: o.opacity, borderOpacity: o.opacity });
    } else {
      this.page.drawRectangle({ x, y: H - top - height, width, height, color: o.fill, borderColor: o.stroke, borderWidth: strokeWidth, opacity: o.opacity, borderOpacity: o.opacity });
    }
  }

  /** SVG path drawn at `scale`, positioned by its own origin at (x, top). */
  path(d: string, x: number, top: number, scale: number, o: { fill?: RGB; stroke?: RGB; width?: number; opacity?: number; round?: boolean } = {}) {
    this.page.drawSvgPath(d, {
      x,
      y: H - top,
      scale,
      color: o.fill,
      borderColor: o.stroke,
      borderWidth: o.stroke ? (o.width ?? 1) : 0,
      opacity: o.opacity,
      borderOpacity: o.opacity,
      borderLineCap: o.round ? LineCapStyle.Round : undefined,
    });
  }

  rule(x1: number, x2: number, top: number, color: RGB = C.cardBorder, thickness = 0.8, opacity = 1) {
    this.page.drawLine({ start: { x: x1, y: H - top }, end: { x: x2, y: H - top }, thickness, color, opacity });
  }

  vrule(x: number, top1: number, top2: number, color: RGB = C.cardBorder, thickness = 0.8, opacity = 1) {
    this.page.drawLine({ start: { x, y: H - top1 }, end: { x, y: H - top2 }, thickness, color, opacity });
  }

  /** Runs `draw` with everything clipped to a (rounded) rectangle. */
  clipped(x: number, top: number, width: number, height: number, radius: number, draw: () => void) {
    const y = H - top - height;
    const r = Math.min(radius, width / 2, height / 2);
    const k = 0.5523 * r;
    this.page.pushOperators(
      pushGraphicsState(),
      moveTo(x + r, y),
      lineTo(x + width - r, y),
      appendBezierCurve(x + width - r + k, y, x + width, y + r - k, x + width, y + r),
      lineTo(x + width, y + height - r),
      appendBezierCurve(x + width, y + height - r + k, x + width - r + k, y + height, x + width - r, y + height),
      lineTo(x + r, y + height),
      appendBezierCurve(x + r - k, y + height, x, y + height - r + k, x, y + height - r),
      lineTo(x, y + r),
      appendBezierCurve(x, y + r - k, x + r - k, y, x + r, y),
      closePath(),
      clip(),
      endPath(),
    );
    draw();
    this.page.pushOperators(popGraphicsState());
  }

  /** Vector gradient (thin bands) inside an optionally rounded box: no raster images, tiny files. */
  gradient(x: number, top: number, width: number, height: number, from: RGB, to: RGB, o: { radius?: number; horizontal?: boolean } = {}) {
    const steps = Math.min(90, Math.max(12, Math.ceil((o.horizontal ? width : height) / 1.5)));
    this.clipped(x, top, width, height, o.radius ?? 0, () => {
      for (let i = 0; i < steps; i += 1) {
        const color = mix(from, to, i / (steps - 1));
        if (o.horizontal) {
          const w = width / steps;
          this.page.drawRectangle({ x: x + i * w, y: H - top - height, width: w + 0.6, height, color });
        } else {
          const h = height / steps;
          this.page.drawRectangle({ x, y: H - top - (i + 1) * h, width, height: h + 0.6, color });
        }
      }
    });
  }

  /** Card with a soft blue shadow, a hairline border and rounded corners. */
  card(x: number, top: number, width: number, height: number, radius = u(26)) {
    this.box(x - 1, top + 3, width + 2, height + 1, { fill: rgb(0.1, 0.4, 0.8), radius: radius + 1, opacity: 0.045 });
    this.box(x, top + 1.5, width, height, { fill: rgb(0.1, 0.4, 0.8), radius, opacity: 0.05 });
    this.box(x, top, width, height, { fill: C.card, stroke: C.cardBorder, radius, width: 0.9 });
  }

  /** Lucide icon drawn as vector strokes. `size` is the icon's width/height in points. */
  icon(name: string, x: number, top: number, size: number, color: RGB, weight = 2) {
    const nodes = ICON_NODES[name];
    if (!nodes) return;
    for (const [tag, attrs] of nodes) {
      const d = shapeToPath(tag, attrs);
      if (d) this.path(d, x, top, size / 24, { stroke: color, width: weight, round: true });
    }
  }

  /** Round (or rounded-square) badge with an icon centred inside. */
  iconBadge(name: string, x: number, top: number, size: number, o: { fill?: RGB; stroke?: RGB; color?: RGB; radius?: number; weight?: number } = {}) {
    this.box(x, top, size, size, { fill: o.fill ?? C.tintStrong, stroke: o.stroke, radius: o.radius ?? size / 2, width: 0.8 });
    const inner = size * 0.52;
    this.icon(name, x + (size - inner) / 2, top + (size - inner) / 2, inner, o.color ?? C.blue, o.weight ?? 2);
  }

  /** Status pill; returns its width. `right` is the pill's right edge. */
  pill(label: string, right: number, top: number, height: number, tone: Tone, iconName?: string, textSize = fs(26)): number {
    const palette = {
      green: { bg: C.greenBg, border: rgb(0.7, 0.88, 0.76), fg: C.green },
      amber: { bg: C.amberBg, border: C.amberBorder, fg: C.amber },
      red: { bg: C.redBg, border: rgb(0.95, 0.72, 0.7), fg: C.red },
      blue: { bg: C.blueBg, border: C.cardBorder, fg: C.blue },
    }[tone];
    const text = label.toUpperCase();
    const iconSize = iconName ? height * 0.46 : 0;
    const width = this.measure(text, textSize, true) + (iconName ? iconSize + height * 0.9 : height * 0.9);
    const left = right - width;
    this.box(left, top, width, height, { fill: palette.bg, stroke: palette.border, radius: height / 2, width: 1 });
    let cursor = left + height * 0.42;
    if (iconName) {
      this.icon(iconName, cursor, top + (height - iconSize) / 2, iconSize, palette.fg, 2.4);
      cursor += iconSize + height * 0.14;
    }
    this.text(text, cursor, top + height / 2 + textSize * 0.35, { size: textSize, bold: true, color: palette.fg });
    return width;
  }

  image(img: PDFImage, x: number, top: number, width: number, height: number, opacity = 1) {
    this.page.drawImage(img, { x, y: H - top - height, width, height, opacity });
  }

  /** QR code drawn as ONE filled path (runs of dark modules), so viewers never show seams between cells. */
  qr(value: string, x: number, top: number, size: number, color: RGB = C.navy) {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    const count = qr.modules.size;
    const cell = size / count;
    const parts: string[] = [];
    for (let row = 0; row < count; row += 1) {
      let col = 0;
      while (col < count) {
        if (!qr.modules.get(row, col)) {
          col += 1;
          continue;
        }
        let end = col;
        while (end < count && qr.modules.get(row, end)) end += 1;
        const w = (end - col) * cell;
        parts.push(`M ${(col * cell).toFixed(3)} ${(row * cell).toFixed(3)} h ${w.toFixed(3)} v ${cell.toFixed(3)} h ${(-w).toFixed(3)} Z`);
        col = end;
      }
    }
    this.page.drawSvgPath(parts.join(" "), { x, y: H - top, color });
  }
}

/* --------------------------------- document --------------------------------- */

export type Assets = {
  logo: PDFImage;
  /** width / height of the logo that was embedded (the built-in one or the owner's). */
  logoAspect: number;
  mark: PDFImage;
  vehicle: PDFImage | null;
};

export async function createDocument(title: string, vehiclePhotoKey: string | null, customLogoPng: Buffer | null = null) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer("Veera Tours & Travels");
  const page = doc.addPage([W, H]);
  const [regular, bold, logo, mark] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
    doc.embedPng(customLogoPng ?? Buffer.from(LOGO_PNG_BASE64, "base64")),
    doc.embedPng(Buffer.from(LOGO_MARK_WHITE_PNG_BASE64, "base64")),
  ]);
  const photo = vehiclePhotoKey ? VEHICLE_PHOTOS_PNG_BASE64[vehiclePhotoKey] : undefined;
  const vehicle = photo ? await doc.embedPng(Buffer.from(photo, "base64")) : null;
  const canvas = new Canvas(doc, page, regular, bold);
  canvas.box(0, 0, W, H, { fill: C.page });
  const logoAspect = customLogoPng ? logo.width / logo.height : LOGO_ASPECT;
  return { canvas, assets: { logo, logoAspect, mark, vehicle } as Assets };
}

/* ------------------------------ shared page art ------------------------------ */


/** Header: soft wave, logo, contact block, the booked vehicle and the title. Returns where the body starts (in points). */
export function drawHeader(
  c: Canvas,
  a: Assets,
  site: SiteData,
  o: {
    title: string;
    subtitle: string;
    icon: string;
    /** "inline": the title sits at the left of the art (ticket). "row": a title row below the art (invoice). */
    layout: "inline" | "row";
    status?: { label: string; tone: Tone; icon: string };
    showContact?: boolean;
    showGstin?: boolean;
  },
): number {
  const p = (d: string, fill: RGB, opacity = 1) => c.path(d, OX, 0, S, { fill, opacity });

  // soft waves in the top-left corner
  p("M 0 0 H 510 C 488 74 410 124 296 142 C 196 158 96 150 0 206 Z", C.wave1);
  p("M 0 150 C 120 128 240 168 400 144 C 520 126 610 166 760 180 C 640 214 470 214 300 204 C 180 198 80 214 0 246 Z", C.wave2, 0.9);

  // the booked vehicle (transparent photo)
  if (a.vehicle) {
    const carWidth = u(262);
    const carHeight = (carWidth * a.vehicle.height) / a.vehicle.width;
    c.image(a.vehicle, X(716), u(238) - carHeight, carWidth, carHeight);
  }

  // logo
  const logoHeight = u(54);
  const logoWidth = Math.min(u(330), logoHeight * a.logoAspect);
  c.image(a.logo, X(50), u(34), logoWidth, logoWidth / a.logoAspect);

  // contact block (right aligned): address on two lines, then phone | email
  const size = fs(20);
  const right = X(1012);
  const showContact = o.showContact !== false;
  if (showContact) {
    const addrW = Math.max(c.measure(site.address.line1, size), c.measure(site.address.line2, size));
    c.icon("map-pin", right - addrW - u(34), u(22), u(26), C.navy, 2.2);
    c.text(site.address.line1, right - addrW, u(38), { size });
    c.text(site.address.line2, right - addrW, u(60), { size });
    const emailW = c.measure(site.email, size);
    const phoneW = c.measure(site.primaryPhone.display, size);
    c.icon("mail", right - emailW - u(32), u(76), u(22), C.navy, 2.2);
    c.text(site.email, right - emailW, u(91), { size });
    const phoneRight = right - emailW - u(48);
    c.vrule(phoneRight + u(20), u(76), u(98), C.cardBorder, 1);
    c.icon("phone", phoneRight - phoneW - u(32), u(76), u(22), C.navy, 2.2);
    c.text(site.primaryPhone.display, phoneRight - phoneW, u(91), { size });
  }
  if (site.gstin && o.showGstin !== false) c.text(`GSTIN: ${site.gstin}`, X(54), u(112), { size: fs(17), bold: true, color: C.navy });

  // title
  if (o.layout === "inline") {
    c.icon(o.icon, X(48), u(150), u(66), C.navy, 1.7);
    c.text(o.title, X(132), u(196), { size: fs(52), bold: true, color: C.navy });
    c.text(o.subtitle, X(136), u(226), { size: fs(22), color: C.muted });
    return u(288);
  }
  c.box(X(57), u(266), u(62), u(62), { fill: C.card, stroke: C.blue, radius: u(14), width: 1.8 });
  c.icon(o.icon, X(57) + u(13), u(266) + u(13), u(36), C.blue, 2);
  c.text(o.title, X(142), u(312), { size: fs(52), bold: true, color: C.navy });
  c.text(o.subtitle, X(146), u(342), { size: fs(22), color: C.muted });
  c.vrule(X(504), u(272), u(334), C.cardBorder, 1);
  if (o.status) c.pill(o.status.label, X(1008), u(270), u(60), o.status.tone, o.status.icon, fs(26));
  return u(372);
}

/** Dark footer band with the white logo mark, thank-you line, support numbers and a reference. */
export function drawFooter(c: Canvas, a: Assets, site: SiteData, reference: string, footer?: DocumentLayout["footer"]) {
  const top = u(1314);
  c.path("M 0 40 C 220 -2 600 56 1052 4 V 120 H 0 Z", OX, top, S, { fill: C.footTop });
  c.path("M 690 22 C 830 24 940 12 1052 -6 V 8 C 960 22 840 40 690 38 Z", OX, top, S, { fill: C.footAccent, opacity: 0.9 });
  c.gradient(0, u(1348), W, H - u(1348), C.footTop, C.footBottom);
  c.box(0, u(1418), W, H - u(1418), { fill: C.footBar });
  c.rule(X(40), X(1012), u(1418), C.white, 0.6, 0.18);

  const markHeight = u(58);
  c.image(a.mark, X(78), u(1340), markHeight * LOGO_MARK_ASPECT, markHeight);
  c.vrule(X(206), u(1332), u(1402), C.white, 0.7, 0.3);
  c.text(footer?.thanks || "Thank you for choosing", X(236), u(1362), { size: fs(25), bold: true, color: C.white });
  c.text(site.name, X(236), u(1396), { size: fs(25), bold: true, color: C.white });
  if (footer?.showSupport !== false) {
    c.vrule(X(588), u(1332), u(1402), C.white, 0.7, 0.3);
    c.icon("headset", X(644), u(1340), u(50), C.white, 1.8);
    c.text(footer?.supportLabel || "Support 24x7:", X(706), u(1362), { size: fs(18), bold: true, color: C.white });
    const phones = [site.primaryPhone.display, site.secondaryPhone.display].filter(Boolean).join("  /  ");
    c.text(phones, X(706), u(1388), { size: fs(18), color: C.white });
  }

  c.icon("laptop", X(58), u(1436), u(30), C.white, 1.8);
  c.text(footer?.note ?? "This is a computer-generated document and does not need a signature.", X(104), u(1459), { size: fs(16.5), color: C.white });
  c.vrule(X(790), u(1432), u(1478), C.white, 0.7, 0.3);
  c.text(reference, X(1012), u(1459), { size: fs(17), bold: true, color: C.white, align: "right" });
}

export type Row = { label: string; value: string; bold?: boolean; color?: RGB; icon?: string };
