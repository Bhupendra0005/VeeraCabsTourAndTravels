import { HomePage } from "@/components/site/home-page";
import { destinationCategories } from "@/lib/content";
import {
  getAreas,
  getDestinations,
  getFaqs,
  getFeaturesData,
  getFleetData,
  getHome,
} from "@/lib/server/cms/content";

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

  return <HomePage home={home} fleet={fleet} features={features} faqs={faqs} dropOptions={dropOptions} />;
}
