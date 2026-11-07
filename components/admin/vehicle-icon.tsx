import { Bus, Car, CarFront, Van } from "lucide-react";
import type { ReactNode } from "react";

/** Picks a fitting icon from a vehicle's name (Sedan, SUV, MPV, Tempo Traveller...). */
export function vehicleIcon(type: string): ReactNode {
  const t = type.toLowerCase();
  if (t.includes("tempo") || t.includes("traveller") || t.includes("traveler") || t.includes("bus")) return <Bus />;
  if (t.includes("mpv") || t.includes("van") || t.includes("innova") || t.includes("ertiga")) return <Van />;
  if (t.includes("suv")) return <CarFront />;
  return <Car />;
}
