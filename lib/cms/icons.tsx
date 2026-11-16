import {
  BusFront,
  CalendarCheck,
  CarFront,
  Clock3,
  Headphones,
  MapPin,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";

/** Icons the owner can pick from. The database stores the key, never a component. */
export const ICONS: Record<string, LucideIcon | typeof WhatsAppIcon> = {
  car: CarFront,
  users: Users,
  bus: BusFront,
  clock: Clock3,
  shield: ShieldCheck,
  sparkles: Sparkles,
  headphones: Headphones,
  wallet: Wallet,
  whatsapp: WhatsAppIcon,
  calendar: CalendarCheck,
  pin: MapPin,
  plane: Plane,
  route: Route,
  star: Star,
};

export const ICON_OPTIONS = [
  { value: "car", label: "Car" },
  { value: "users", label: "People" },
  { value: "bus", label: "Bus / tempo traveller" },
  { value: "clock", label: "Clock" },
  { value: "shield", label: "Shield" },
  { value: "sparkles", label: "Sparkles" },
  { value: "headphones", label: "Headphones" },
  { value: "wallet", label: "Wallet" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "calendar", label: "Calendar / booking" },
  { value: "pin", label: "Map pin" },
  { value: "plane", label: "Plane" },
  { value: "route", label: "Route" },
  { value: "star", label: "Star" },
];

export function resolveIcon(key: string, fallback = "star") {
  return ICONS[key] ?? ICONS[fallback];
}
