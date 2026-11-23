import {
  BadgeIndianRupee,
  BusFront,
  CalendarCheck,
  CarFront,
  Clock3,
  Headphones,
  Landmark,
  MapPin,
  Mountain,
  Navigation,
  Plane,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
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
  send: Send,
  rupee: BadgeIndianRupee,
  thumbs: ThumbsUp,
  landmark: Landmark,
  mountain: Mountain,
  navigation: Navigation,
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
  { value: "send", label: "Paper plane (search)" },
  { value: "rupee", label: "Rupee (price)" },
  { value: "thumbs", label: "Thumbs up" },
  { value: "landmark", label: "Temple / landmark" },
  { value: "mountain", label: "Mountain / hill station" },
  { value: "navigation", label: "Navigation arrow" },
];

export function resolveIcon(key: string, fallback = "star") {
  return ICONS[key] ?? ICONS[fallback];
}
