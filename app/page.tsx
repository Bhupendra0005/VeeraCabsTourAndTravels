import type { Metadata } from "next";
import { HomePage } from "@/components/site/home-page";
import type { HomeSearch } from "@/components/site/hero";
import { destinationCategories } from "@/lib/content";
import { parseSearch } from "@/lib/booking/search";
import { listSearchOptions } from "@/lib/server/bookings/service";
import {
  getBookingPage,
  getBookingSettings,
  getAreas,
  getDestinations,
  getFaqs,
  getFeaturesData,
  getFleetData,
  getHome,
} from "@/lib/server/cms/content";

/** The home page is the one page whose canonical address is the site root. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [home, fleet, features, faqs, destinations, areas] = await Promise.all([
    getHome(),
    getFleetData(),
    getFeaturesData(),
    getFaqs(),
    getDestinations(),
    getAreas(),
  ]);

  // suggestions for the "where to" box in the hero
  const dropOptions = [
    ...destinations.map((place) => ({
      label: place.name,
      hint: destinationCategories.find((category) => category.id === place.category)?.label,
    })),
    ...areas.map((area) => ({ label: area.name, hint: "Pune area" })),
  ];

  // the same search box as the Book Online page. If booking is paused or the fares cannot be loaded, the home page falls back to its simple bar.
  let search: HomeSearch | null = null;
  try {
    const [options, page, settings] = await Promise.all([listSearchOptions(), getBookingPage(), getBookingSettings()]);
    if (settings.onlineBookingEnabled && options.cities.from.length > 0) {
      const initial = parseSearch({ tripType: "one_way", from: options.cities.from.includes("Pune") ? "Pune" : "" });
      search = {
        options,
        initial,
        tabs: [
          "one_way",
          ...(page.showRoundTripTab || !page.oneWayReturn ? ["round_trip"] : []),
          ...(page.enableAirport && options.airports.length > 0 ? ["airport"] : []),
          ...(page.enableHourly && options.hourlyCities.length > 0 ? ["hourly"] : []),
        ],
        maxStops: page.enableStops ? page.maxStops : 0,
        oneWayReturn: page.oneWayReturn,
        returnHint: page.returnHint,
        askTravellers: { airport: page.airportAskTravellers, hourly: page.hourlyAskTravellers },
        suggestions: page.addressSuggestions,
      };
    }
  } catch (error) {
    console.error("Home search box unavailable, using the simple bar", error);
  }

  return <HomePage home={home} fleet={fleet} features={features} faqs={faqs} dropOptions={dropOptions} search={search} />;
}
