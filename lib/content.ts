import {
  BusFront,
  CalendarCheck,
  CarFront,
  Clock3,
  Headphones,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/* ------------------------------------------------------------------ */
/* Shared home / about content                                         */
/* ------------------------------------------------------------------ */

export const features: { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; text: string }[] = [
  {
    icon: Wallet,
    title: "Clear, upfront quotes",
    text: "You know the price before you travel. Nothing extra is added at the end.",
  },
  {
    icon: ShieldCheck,
    title: "Experienced chauffeurs",
    text: "Polite, licensed drivers who know the ghats and highways of Maharashtra well.",
  },
  {
    icon: Sparkles,
    title: "Clean, AC vehicles",
    text: "Clean cars with cool AC and enough space for your bags.",
  },
  {
    icon: Clock3,
    title: "Punctual doorstep pickup",
    text: "We plan around your time and reach before you step out.",
  },
  {
    icon: CalendarCheck,
    title: "Easy online booking",
    text: "Pick your cab, pay securely and get your e-ticket by email. No app needed.",
  },
  {
    icon: Headphones,
    title: "24/7 local support",
    text: "A real person from our Pune team is there to help before, during and after your ride.",
  },
];

export const fleet: {
  icon: LucideIcon;
  /** Photo in /public: `<photo>-480.webp` and `<photo>-800.webp`. */
  photo: string;
  title: string;
  seats: string;
  luggage: string;
  description: string;
}[] = [
  {
    icon: CarFront,
    photo: "fleet-sedan",
    title: "Sedan",
    seats: "4 passengers",
    luggage: "2 bags",
    description: "City hops, airport drops and couple-friendly comfort.",
  },
  {
    icon: CarFront,
    photo: "fleet-suv",
    title: "Premium SUV",
    seats: "6–7 passengers",
    luggage: "4 bags",
    description: "Family holidays and long highway drives with room to relax.",
  },
  {
    icon: Users,
    photo: "fleet-mpv",
    title: "Spacious MPV",
    seats: "6 passengers",
    luggage: "3 bags",
    description: "Easy group airport runs and comfortable outstation travel.",
  },
  {
    icon: BusFront,
    photo: "fleet-tempo",
    title: "Tempo Traveller",
    seats: "12–17 passengers",
    luggage: "10+ bags",
    description: "Weddings, group tours and yatras that move together.",
  },
];

/* ------------------------------------------------------------------ */
/* Destinations                                                         */
/* ------------------------------------------------------------------ */

export type DestinationCategory = "hill-station" | "temple" | "beach" | "city";

export const destinationCategories: {
  id: DestinationCategory;
  label: string;
  plural: string;
  blurb: string;
}[] = [
  {
    id: "hill-station",
    label: "Hill station",
    plural: "Hill stations",
    blurb:
      "Cool ghat roads, misty viewpoints and lake-side stops within a few hours of Pune.",
  },
  {
    id: "temple",
    label: "Temple & pilgrimage",
    plural: "Religious temples",
    blurb:
      "Jyotirlingas, Shakti Peethas and the Ashtavinayak circuit, planned around darshan timings.",
  },
  {
    id: "beach",
    label: "Beach",
    plural: "Beaches",
    blurb:
      "Konkan shores and Goa — long drives with the sea waiting at the end.",
  },
  {
    id: "city",
    label: "City & attraction",
    plural: "Cities & attractions",
    blurb:
      "Mumbai, Kolhapur, Aurangabad, Kaas Plateau and family day-out destinations.",
  },
];

export type Destination = {
  slug: string;
  name: string;
  category: DestinationCategory;
  /** Approximate road distance from Pune. */
  distance: string;
  /** Approximate one-way drive time. */
  duration: string;
  bestTime: string;
  tagline: string;
  intro: string;
  highlights: string[];
  tips: string[];
};

export const destinations: Destination[] = [
  /* ---------------- Hill stations ---------------- */
  {
    slug: "lonavala-khandala",
    name: "Lonavala & Khandala",
    category: "hill-station",
    distance: "~65 km",
    duration: "1.5–2 hrs",
    bestTime: "June to September for waterfalls; October to February for pleasant weather",
    tagline: "The classic Pune weekend escape.",
    intro:
      "Lonavala and Khandala sit on the Sahyadri ridge just off the old Mumbai–Pune route, which makes them the easiest hill getaway from the city. Monsoon turns the valleys green and the roadside stalls fill with hot corn and chikki, while winter mornings are calm and clear.",
    highlights: [
      "Bhushi Dam and the monsoon waterfalls around it",
      "Lion’s Point and Tiger’s Point viewpoints",
      "Karla and Bhaja rock-cut caves",
      "Rajmachi Fort and Lohagad Fort for easy hikes",
      "Lonavala’s famous chikki and fudge shops",
    ],
    tips: [
      "Weekends in July and August get crowded; leave early or travel on a weekday.",
      "Ask us to wait while you hike — waiting time is quoted upfront.",
      "Combine with Imagica or Karla caves for a full-day plan.",
    ],
  },
  {
    slug: "mahabaleshwar-panchgani",
    name: "Mahabaleshwar & Panchgani",
    category: "hill-station",
    distance: "~120 km",
    duration: "3–3.5 hrs",
    bestTime: "October to May; the monsoon is lush but heavy rain can close viewpoints",
    tagline: "Strawberries, plateaus and big Sahyadri views.",
    intro:
      "Maharashtra’s most loved hill station pairs Mahabaleshwar’s forested viewpoints with Panchgani’s wide table-land plateau a short drive away. The road climbs through Wai and Dhom, so a chauffeur who knows the ghats makes the ride far more relaxing.",
    highlights: [
      "Venna Lake boating and the market lane beside it",
      "Arthur’s Seat and Elephant’s Head Point",
      "Table Land in Panchgani",
      "Fresh strawberries from local farms (peak in winter and early summer)",
      "Pratapgad Fort for history lovers",
    ],
    tips: [
      "Plan at least one night if you want to see both Mahabaleshwar and Panchgani.",
      "Peak-season weekends fill up quickly, so book the car early.",
      "Carry a light jacket — evenings are cool even in summer.",
    ],
  },
  {
    slug: "lavasa",
    name: "Lavasa",
    category: "hill-station",
    distance: "~60 km",
    duration: "1.5–2 hrs",
    bestTime: "July to February",
    tagline: "A planned lakeside town for an easy day out.",
    intro:
      "Lavasa is a Mediterranean-style hill town built around Warasgaon Lake, reached through the Mulshi and Temghar side of the Sahyadris. It suits families and couples who want a relaxed lakeside walk, a good meal and a scenic drive without a long journey.",
    highlights: [
      "Lakeside promenade and pastel waterfront",
      "Scenic Mulshi–Temghar drive",
      "Cycling, walking and relaxed café stops",
      "Quiet resort stays for a short break",
    ],
    tips: [
      "Activities and eateries vary through the year, so check what is open before you travel.",
      "A same-day return from Pune is easy with an early start.",
      "Monsoon fog can slow the road; we plan extra time.",
    ],
  },
  {
    slug: "matheran",
    name: "Matheran",
    category: "hill-station",
    distance: "~120 km to Dasturi Naka",
    duration: "3–3.5 hrs",
    bestTime: "October to February; monsoon is beautiful but slippery",
    tagline: "India’s car-free hill station.",
    intro:
      "Matheran bans motor vehicles inside the town, which gives it a calm, forest-trail feel. Your car takes you to Dasturi Naka near Neral, and from there you can walk, ride a horse or take a hand-pulled rickshaw. The toy train from Neral is a charming option when it is running.",
    highlights: [
      "Echo Point, Louisa Point and Panorama Point",
      "Charlotte Lake and the forest trails",
      "Horse rides along the red-soil lanes",
      "The Neral–Matheran toy train (subject to schedule)",
    ],
    tips: [
      "Wear sturdy shoes — most of the town is explored on foot.",
      "Our car waits at the parking area, so a day trip works well.",
      "Keep luggage light; porters can carry bags up if needed.",
    ],
  },
  {
    slug: "kolad",
    name: "Kolad & Tamhini Ghat",
    category: "hill-station",
    distance: "~115 km",
    duration: "3–3.5 hrs",
    bestTime: "June to September for rafting and waterfalls",
    tagline: "White-water rafting and a waterfall-lined ghat.",
    intro:
      "Kolad is the adventure stop on the Konkan side of the ghats, known for rafting on the Kundalika river. The route from Pune climbs through Tamhini Ghat, one of the prettiest monsoon drives in the region, with waterfalls and low clouds along the way.",
    highlights: [
      "White-water rafting on the Kundalika river",
      "Waterfalls and viewpoints on Tamhini Ghat",
      "Riverside camping and resort stays",
      "Nearby Devkund waterfall for trekkers",
    ],
    tips: [
      "Rafting runs in the monsoon season depending on water release; confirm dates with your operator.",
      "Ghat roads can be slick in heavy rain, so our drivers keep a steady pace.",
      "Good for groups and corporate outings — ask about a tempo traveller.",
    ],
  },

  /* ---------------- Temples ---------------- */
  {
    slug: "shirdi",
    name: "Shirdi & Shani Shingnapur",
    category: "temple",
    distance: "~185 km",
    duration: "4–5 hrs",
    bestTime: "October to March; avoid festival peaks if you prefer shorter queues",
    tagline: "Sai Baba darshan with a comfortable, planned ride.",
    intro:
      "Shirdi is one of the most visited pilgrimage towns in India, and Shani Shingnapur lies about an hour away, so the two are often combined into one trip. A private car lets you leave Pune at the hour that suits your darshan slot instead of fitting around bus timings.",
    highlights: [
      "Sai Baba Samadhi Mandir and the surrounding darshan complex",
      "Dwarkamai, Chavadi and Gurusthan",
      "Lendi Baug garden",
      "Shani Shingnapur temple, roughly an hour from Shirdi",
      "Shirdi airport (SAG) pickup and drop on request",
    ],
    tips: [
      "Thursdays, Ram Navami, Guru Purnima and Dussehra are very crowded.",
      "Early-morning departures help you reach before the long queues build.",
      "Tell us your darshan timings and we will plan departure and return around them.",
    ],
  },
  {
    slug: "nashik-trimbakeshwar",
    name: "Nashik & Trimbakeshwar",
    category: "temple",
    distance: "~210 km",
    duration: "4–5 hrs",
    bestTime: "October to March",
    tagline: "A Jyotirlinga, a holy river and vineyard country.",
    intro:
      "Nashik is a Godavari-river pilgrimage city and the gateway to Trimbakeshwar, one of the twelve Jyotirlingas. It is also Maharashtra’s wine region, so many travellers combine temple darshan with a vineyard visit in the same trip.",
    highlights: [
      "Trimbakeshwar Jyotirlinga temple",
      "Panchavati, Kalaram Mandir and Sita Gufa",
      "Pandavleni caves",
      "Saptashrungi Devi temple (a longer detour)",
      "Vineyard tours around Nashik",
    ],
    tips: [
      "Trimbakeshwar can have long queues on Mondays and festival days.",
      "Add one night if you want to cover both the temples and a vineyard.",
      "One-way drops to Nashik are available if you are travelling onward.",
    ],
  },
  {
    slug: "bhimashankar",
    name: "Bhimashankar",
    category: "temple",
    distance: "~110 km",
    duration: "3–3.5 hrs",
    bestTime: "October to February; monsoon is scenic but slippery",
    tagline: "A Jyotirlinga set deep in the Sahyadri forest.",
    intro:
      "Bhimashankar is a Jyotirlinga temple inside a wildlife sanctuary on the crest of the Western Ghats. The last stretch is a forested ghat road, and the temple area is known for its cool air and views. It is a comfortable day or overnight trip from Pune.",
    highlights: [
      "Bhimashankar Jyotirlinga temple",
      "Bhimashankar Wildlife Sanctuary and its forest trails",
      "Chance to spot the Indian giant squirrel (Shekru)",
      "Sahyadri viewpoints near the temple",
    ],
    tips: [
      "Mondays and the Shravan month see big crowds; plan an early start.",
      "Monsoon fog is beautiful but slows the ghat section.",
      "Wear comfortable footwear for the steps and trails.",
    ],
  },
  {
    slug: "pandharpur",
    name: "Pandharpur",
    category: "temple",
    distance: "~205 km",
    duration: "4–4.5 hrs",
    bestTime: "October to March; Ashadhi and Kartiki Ekadashi draw huge crowds",
    tagline: "Vithoba’s town on the Chandrabhaga river.",
    intro:
      "Pandharpur is the heart of the Warkari tradition, home to the Vitthal–Rukmini temple on the banks of the Chandrabhaga. Lakhs of devotees walk here for Ashadhi Ekadashi. Outside those peaks, it is a calm and rewarding darshan trip from Pune.",
    highlights: [
      "Shri Vitthal–Rukmini Mandir",
      "Chandrabhaga river ghats",
      "Combine with Tuljapur or Akkalkot for a longer yatra",
    ],
    tips: [
      "Avoid the Ekadashi days unless you specifically want the festival atmosphere.",
      "Start early to finish darshan before the afternoon rush.",
      "A same-day return is possible but long; an overnight stay is more relaxed.",
    ],
  },
  {
    slug: "ashtavinayak",
    name: "Ashtavinayak Darshan",
    category: "temple",
    distance: "~650 km circuit",
    duration: "2 days",
    bestTime: "October to March; Ganesh Chaturthi is the busiest time",
    tagline: "Eight Ganesh temples, one planned circuit.",
    intro:
      "The Ashtavinayak yatra covers eight self-manifested Ganesh temples around Pune: Morgaon, Siddhatek, Pali, Mahad, Theur, Lenyadri, Ozar and Ranjangaon. They are spread across several districts, so the order and the overnight stop make a big difference. We plan the circuit around your darshan timings.",
    highlights: [
      "Mayureshwar (Morgaon) and Siddhivinayak (Siddhatek)",
      "Ballaleshwar (Pali) and Varadvinayak (Mahad)",
      "Chintamani (Theur) and Mahaganapati (Ranjangaon)",
      "Girijatmaj (Lenyadri) and Vighneshwar (Ozar)",
    ],
    tips: [
      "Most families complete the circuit in two days with one night’s stay.",
      "Tell us your preferred order and we will suggest a sensible route.",
      "Tempo travellers are popular for family and society group yatras.",
    ],
  },
  {
    slug: "jejuri",
    name: "Jejuri",
    category: "temple",
    distance: "~50 km",
    duration: "1–1.5 hrs",
    bestTime: "Year-round; festival days are very crowded",
    tagline: "Khandoba’s hilltop shrine, a short drive from the city.",
    intro:
      "Jejuri is the seat of Khandoba, a deity held very dear in Maharashtra, and the hilltop temple is famously showered in turmeric. It is an easy half-day trip from Pune and pairs naturally with other temples on the Saswad and Purandar side.",
    highlights: [
      "Khandoba temple on the hill, reached by a long flight of steps",
      "The turmeric-covered temple complex",
      "Combine with Saswad and Purandar Fort",
    ],
    tips: [
      "Somvati Amavasya and festival days attract very large crowds.",
      "Go early in the day to avoid heat on the steps.",
      "Easy to combine with another nearby stop in one day.",
    ],
  },
  {
    slug: "tuljapur",
    name: "Tuljapur",
    category: "temple",
    distance: "~270 km",
    duration: "5–6 hrs",
    bestTime: "October to March; Navratri is the busiest period",
    tagline: "Tulja Bhavani, the family goddess of many Maharashtrians.",
    intro:
      "The Tulja Bhavani temple at Tuljapur is a Shakti Peeth and the kuldevi of countless Maharashtrian families, so many travel here for family rituals. It lies beyond Solapur, and a chauffeur-driven trip lets elders and children travel comfortably over the long distance.",
    highlights: [
      "Shri Tulja Bhavani temple",
      "Combine with Pandharpur on the same yatra",
      "Akkalkot and Solapur are close by for a longer trip",
    ],
    tips: [
      "Navratri and Tuesdays are heavily crowded.",
      "Plan an overnight halt for a relaxed schedule.",
      "Pandharpur and Tuljapur together make a good two-day itinerary.",
    ],
  },

  /* ---------------- Beaches ---------------- */
  {
    slug: "alibaug",
    name: "Alibaug",
    category: "beach",
    distance: "~150 km",
    duration: "3.5–4 hrs",
    bestTime: "October to March",
    tagline: "Quiet beaches and sea forts close to the city.",
    intro:
      "Alibaug is the nearest proper beach getaway for Pune, a cluster of laid-back beaches, villas and forts along the Raigad coast. It is popular for long weekends and group outings, with seafood being a highlight.",
    highlights: [
      "Alibaug, Kihim, Nagaon and Varsoli beaches",
      "Kolaba Fort, reached on foot at low tide",
      "Fresh coastal seafood",
      "Easy extension to Kashid and Murud-Janjira",
    ],
    tips: [
      "Check tide timings before walking out to Kolaba Fort.",
      "Weekends are busy; a Friday departure is more relaxed.",
      "Swim only where it is clearly safe and follow local lifeguard advice.",
    ],
  },
  {
    slug: "kashid",
    name: "Kashid & Murud-Janjira",
    category: "beach",
    distance: "~170 km",
    duration: "4–4.5 hrs",
    bestTime: "October to February",
    tagline: "White sand, clear water and an island fort.",
    intro:
      "Kashid has one of the cleaner and wider beaches on the Konkan coast, and Murud-Janjira, an island fort reached by boat, is a short drive further south. Together they make a satisfying two-day coastal trip.",
    highlights: [
      "Kashid beach’s long stretch of light sand",
      "Murud-Janjira sea fort (boat ride from Rajapuri)",
      "Korlai Fort and its lighthouse",
      "Phansad Wildlife Sanctuary nearby",
    ],
    tips: [
      "Boat services to Janjira depend on weather and sea conditions.",
      "An overnight stay lets you enjoy the beach in the cooler hours.",
      "Peak holiday weekends are crowded; book accommodation early.",
    ],
  },
  {
    slug: "diveagar",
    name: "Diveagar & Shrivardhan",
    category: "beach",
    distance: "~190 km",
    duration: "4.5–5 hrs",
    bestTime: "October to February",
    tagline: "A calm Konkan beach with a golden Ganesh temple.",
    intro:
      "Diveagar is a quiet beach town in Raigad, known for its calm shore and the Suvarna Ganesh temple. Neighbouring Shrivardhan and Harihareshwar add temples and unhurried coastal scenery, making this a good pick if you want rest rather than nightlife.",
    highlights: [
      "Diveagar beach and its casuarina groves",
      "Suvarna Ganesh temple",
      "Shrivardhan and Harihareshwar for temple and beach stops",
      "Home-style Konkani food at local stays",
    ],
    tips: [
      "Best as a two-day trip given the distance.",
      "Many stays are small homestays, so confirm them in advance.",
      "Carry cash — signal and cards can be patchy in some villages.",
    ],
  },
  {
    slug: "ganpatipule",
    name: "Ganpatipule & Ratnagiri",
    category: "beach",
    distance: "~330 km",
    duration: "7–8 hrs",
    bestTime: "October to March; mango season is April–May",
    tagline: "A beach temple and the heart of Alphonso country.",
    intro:
      "Ganpatipule is famous for the Swayambhu Ganpati temple that stands right beside the sea. It is a long drive from Pune via Kolhapur or the Konkan ghats, so most travellers plan two or three days and combine it with Ratnagiri and the surrounding beaches.",
    highlights: [
      "Swayambhu Ganpati temple on the beach",
      "Aare-Ware beach viewpoint",
      "Jaigad Fort and Ratnagiri town",
      "Alphonso mangoes in season",
    ],
    tips: [
      "Allow a full day for the drive each way.",
      "Ghat sections need careful night-time driving, so we plan daylight arrivals.",
      "Ask about a driver-led itinerary that includes Kolhapur on the way.",
    ],
  },
  {
    slug: "goa",
    name: "Goa",
    category: "beach",
    distance: "~450 km",
    duration: "9–10 hrs",
    bestTime: "November to February; the monsoon is quiet and green",
    tagline: "The long drive that ends with a holiday.",
    intro:
      "Goa is the most popular long holiday from Pune, usually reached through Satara, Kolhapur and the Amboli or Belgaum side. A private car makes the day-long journey comfortable for families, and we plan meal and rest stops so you arrive relaxed.",
    highlights: [
      "North Goa beaches such as Calangute, Baga and Anjuna",
      "South Goa’s quieter beaches such as Palolem and Colva",
      "Old Goa churches and Fort Aguada",
      "Flexible drop to your hotel anywhere in Goa",
    ],
    tips: [
      "Sightseeing inside Goa follows local taxi rules, which we explain when quoting.",
      "Leave early in the morning to reach before dark.",
      "One-way drops and round trips are both available.",
    ],
  },

  /* ---------------- Cities & attractions ---------------- */
  {
    slug: "mumbai",
    name: "Mumbai & Airport",
    category: "city",
    distance: "~150 km",
    duration: "3–3.5 hrs",
    bestTime: "Year-round; avoid peak traffic hours",
    tagline: "The Expressway run to the city and its airport.",
    intro:
      "The Mumbai–Pune Expressway is one of the fastest routes in the state, and a chauffeur-driven car is the most relaxed way to reach Mumbai for work, sightseeing or a flight. Airport drops are timed with traffic buffers so you are not racing the clock.",
    highlights: [
      "Direct drops to Mumbai airport (BOM) terminals",
      "Gateway of India, Marine Drive and Colaba",
      "Siddhivinayak Temple and Juhu",
      "Navi Mumbai and Thane drops on request",
    ],
    tips: [
      "Add extra buffer time for evening flights to allow for city traffic.",
      "Expressway tolls apply and are explained in your quote.",
      "One-way and return transfers are both available.",
    ],
  },
  {
    slug: "aurangabad-ajanta-ellora",
    name: "Aurangabad, Ajanta & Ellora",
    category: "city",
    distance: "~235 km",
    duration: "4.5–5 hrs",
    bestTime: "October to March (June–September is lush but hot and humid at times)",
    tagline: "Two UNESCO cave complexes and a historic city.",
    intro:
      "Aurangabad, now officially Chhatrapati Sambhajinagar, is the base for two of India’s great heritage sites: the Ellora cave temples and the Buddhist murals of Ajanta. The city itself adds Bibi Ka Maqbara and Daulatabad Fort, so most visitors plan at least two days.",
    highlights: [
      "Ellora caves, including the Kailasa temple",
      "Ajanta caves and their ancient paintings",
      "Bibi Ka Maqbara and Daulatabad Fort",
      "Grishneshwar Jyotirlinga near Ellora",
    ],
    tips: [
      "Ajanta is closed on Mondays and Ellora on Tuesdays — plan the order accordingly.",
      "Ajanta is about two hours from the city, so allow a full day.",
      "We can arrange a multi-day trip with a local halt in Aurangabad.",
    ],
  },
  {
    slug: "kolhapur",
    name: "Kolhapur",
    category: "city",
    distance: "~230 km",
    duration: "4.5–5 hrs",
    bestTime: "October to February",
    tagline: "Mahalakshmi darshan, Panhala fort and spicy misal.",
    intro:
      "Kolhapur is a temple city and a food town in equal measure. The Mahalakshmi (Ambabai) temple is one of the Shakti Peeths, and the city is also the classic stop on the way to Goa and Ganpatipule, so it fits naturally into a longer itinerary.",
    highlights: [
      "Mahalakshmi (Ambabai) temple",
      "Panhala Fort and Rankala Lake",
      "New Palace museum",
      "Jyotiba temple on the hill outside town",
      "Kolhapuri misal and the famous chappal market",
    ],
    tips: [
      "Combine with Goa or Ganpatipule for a stop-over on the way.",
      "Friday and Tuesday are special days at the Mahalakshmi temple, with extra crowds.",
      "A one-night stay lets you see the temple, fort and food scene properly.",
    ],
  },
  {
    slug: "kaas-plateau",
    name: "Kaas Plateau & Satara",
    category: "city",
    distance: "~125 km",
    duration: "3 hrs",
    bestTime: "Late August to early October for the flower bloom",
    tagline: "The valley of flowers of the Sahyadris.",
    intro:
      "Kaas Plateau, near Satara, is a UNESCO World Natural Heritage site that blooms with wildflowers after the monsoon. Entry in the flower season is regulated, so planning matters, and the same trip can include Thoseghar waterfalls, Sajjangad and Bamnoli boating.",
    highlights: [
      "Seasonal carpet of wildflowers on Kaas Plateau",
      "Kaas Lake and nearby viewpoints",
      "Thoseghar waterfalls in the monsoon",
      "Sajjangad Fort and Bamnoli lake for a full-day plan",
    ],
    tips: [
      "Check current visitor slots and entry rules before you travel in flower season.",
      "Weekdays are far quieter than weekends.",
      "Carry rain protection; weather changes quickly on the plateau.",
    ],
  },
  {
    slug: "imagica-khopoli",
    name: "Imagica Theme Park, Khopoli",
    category: "city",
    distance: "~80 km",
    duration: "2 hrs",
    bestTime: "October to March; weekdays are quieter",
    tagline: "A family theme-park day, without the driving.",
    intro:
      "Imagica is a theme park and water park near Khopoli, easily reached from Pune on the Expressway. A private car with a driver who waits makes it simple for families with children and grandparents to enjoy the day without worrying about parking or return transport.",
    highlights: [
      "Theme park rides and shows",
      "Water park for hot-weather days",
      "Easy to combine with Lonavala on the same trip",
    ],
    tips: [
      "Check opening days and ticket options before you travel.",
      "Our driver can wait the whole day so you can return when you wish.",
      "A tempo traveller works well for school and society groups.",
    ],
  },
];

export function getDestination(slug: string) {
  return destinations.find((destination) => destination.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Pune areas                                                           */
/* ------------------------------------------------------------------ */

export type Area = {
  slug: string;
  name: string;
  landmarks: string[];
  blurb: string;
};

export const areas: Area[] = [
  {
    slug: "hadapsar",
    name: "Hadapsar",
    landmarks: ["Magarpatta City", "Amanora Park Town", "Seasons Mall", "Solapur Road"],
    blurb:
      "Our booking desk is right here in Hadapsar, at Monal Park. That means short dispatch times for pickups across Hadapsar, Solapur Road and the nearby residential and IT clusters.",
  },
  {
    slug: "kharadi",
    name: "Kharadi",
    landmarks: ["EON IT Park", "World Trade Center Pune", "Kharadi Bypass", "Nagar Road"],
    blurb:
      "Kharadi’s IT parks and fast-growing apartments generate steady airport runs, office commutes and weekend trips. We cover pickups across Kharadi and along Nagar Road.",
  },
  {
    slug: "magarpatta",
    name: "Magarpatta City",
    landmarks: ["Cybercity", "Destination Centre", "Seasons Mall", "Magarpatta Road"],
    blurb:
      "From the Magarpatta township and Cybercity offices, we handle daily corporate pickups, airport transfers and outstation departures with reliable timing.",
  },
  {
    slug: "viman-nagar",
    name: "Viman Nagar",
    landmarks: ["Phoenix Marketcity", "Symbiosis Viman Nagar", "Pune Airport (Lohegaon) nearby"],
    blurb:
      "Viman Nagar is right beside the airport, so it is a convenient base for quick airport pickups and drops, as well as hotel and business-travel transfers.",
  },
  {
    slug: "koregaon-park",
    name: "Koregaon Park",
    landmarks: ["Osho International Meditation Resort", "North Main Road", "Pune Railway Station nearby"],
    blurb:
      "Koregaon Park’s hotels, cafés and residences make it a popular pickup point for airport, railway and sightseeing rides. Our cars are clean, quiet and punctual.",
  },
  {
    slug: "kothrud",
    name: "Kothrud",
    landmarks: ["Karve Road", "Paud Road", "Vanaz", "Bhusari Colony"],
    blurb:
      "Families in Kothrud often book us for airport drops, pilgrimage trips and weekend getaways toward Mahabaleshwar and Lonavala. We arrange doorstep pickup across the area.",
  },
  {
    slug: "aundh",
    name: "Aundh",
    landmarks: ["ITI Road", "Parihar Chowk", "Aundh Gaon", "Aundh–Baner Link Road"],
    blurb:
      "Aundh’s residents and offices use us for airport transfers, intercity rides and family tours. We pick up from societies and offices across the neighbourhood.",
  },
  {
    slug: "baner",
    name: "Baner & Balewadi",
    landmarks: ["Balewadi High Street", "Baner Road", "Sus Road", "Pashan"],
    blurb:
      "For Baner and Balewadi, we offer airport pickups, Mumbai Expressway rides and outstation trips, with a clear fare before you leave.",
  },
  {
    slug: "wakad",
    name: "Wakad",
    landmarks: ["Datta Mandir Road", "Wakad Chowk", "Mumbai–Bengaluru Highway"],
    blurb:
      "Wakad sits right on the highway toward Mumbai and close to Hinjewadi, which makes it a natural starting point for Mumbai, Lonavala and Shirdi trips.",
  },
  {
    slug: "hinjewadi",
    name: "Hinjewadi",
    landmarks: ["Rajiv Gandhi Infotech Park (Phases 1–3)", "Maan", "Marunji"],
    blurb:
      "Hinjewadi’s IT professionals rely on punctual cabs for airport runs, weekend trips and corporate travel. We plan around shift and flight timings.",
  },
  {
    slug: "pimpri-chinchwad",
    name: "Pimpri-Chinchwad",
    landmarks: ["Pimpri", "Chinchwad", "Nigdi", "Akurdi"],
    blurb:
      "From Pimpri-Chinchwad we cover airport transfers, Expressway trips to Mumbai and pilgrimage tours, with doorstep pickup at your address.",
  },
];

export function getArea(slug: string) {
  return areas.find((area) => area.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Services                                                             */
/* ------------------------------------------------------------------ */

export type ServicePage = {
  slug: string;
  title: string;
  tag: string;
  tagline: string;
  summary: string;
  intro: string[];
  whatYouGet: string[];
  idealFor: string[];
  faqs: { question: string; answer: string }[];
  booking: {
    tripType: "One Way" | "Round Trip" | "Airport Transfer" | "Local Rental";
    drop?: string;
    notes: string;
    enquiry?: boolean;
  };
};

export const servicePages: ServicePage[] = [
  {
    slug: "local-car-hire-pune",
    title: "Local Car Hire in Pune",
    tag: "Quick dispatch",
    tagline: "A car and chauffeur at your disposal across the city.",
    summary:
      "Hourly and full-day rentals for meetings, shopping, events and family errands across Pune and Pimpri-Chinchwad.",
    intro: [
      "Sometimes a single ride is not enough. A local car hire gives you a vehicle and a polite, licensed chauffeur for the time you need, whether that is a few hours of client visits or a full day of shopping and family visits.",
      "Our booking desk is in Hadapsar, so we reach most parts of the city quickly. Tell us the date, start time and approximate hours, and we confirm the vehicle and fare before the ride.",
    ],
    whatYouGet: [
      "Chauffeur-driven sedan, SUV, MPV or tempo traveller",
      "Hourly or full-day usage that suits your plan",
      "Flexible stops without re-booking",
      "Clean, air-conditioned vehicles",
      "Fare, usage limits and parking terms explained upfront",
    ],
    idealFor: [
      "Business meetings and client visits",
      "Weddings, receptions and family functions",
      "Shopping and hospital visits",
      "Guests visiting Pune for a few days",
    ],
    faqs: [
      {
        question: "Can I book a car for just a few hours?",
        answer:
          "Yes. Share your start time and the number of hours you expect to need, and we will quote for a suitable local rental.",
      },
      {
        question: "Which areas of Pune do you cover?",
        answer:
          "We cover Pune and Pimpri-Chinchwad, including Hadapsar, Kharadi, Magarpatta, Viman Nagar, Koregaon Park, Kothrud, Aundh, Baner, Wakad and Hinjewadi.",
      },
      {
        question: "What happens if my plan runs longer than expected?",
        answer:
          "Tell the chauffeur and we will extend the booking. Extra time is charged as explained in your original quote.",
      },
    ],
    booking: {
      tripType: "Local Rental",
      drop: "Local city ride",
      notes: "Local car hire in Pune enquiry",
    },
  },
  {
    slug: "outstation-car-hire",
    title: "Outstation Car Hire from Pune",
    tag: "All India",
    tagline: "One-way drops, round trips and multi-day journeys.",
    summary:
      "Planned highway travel from Pune to Mumbai, Shirdi, Nashik, Goa and beyond with a dedicated chauffeur.",
    intro: [
      "Long drives are easier when the car, the driver and the plan are sorted before you leave. We handle outstation trips from Pune across Maharashtra and neighbouring states, for one-way drops as well as return journeys and multi-day itineraries.",
      "You tell us the route and dates; we confirm the right vehicle and a clear quote. Tolls, parking and state permits depend on the route, and we explain them before you book.",
    ],
    whatYouGet: [
      "One-way, round-trip and multi-day options",
      "Experienced highway and ghat-road chauffeurs",
      "Choice of sedan, SUV, MPV or tempo traveller",
      "Upfront fare with toll and permit details explained",
      "Instant e-ticket by email, no app required",
    ],
    idealFor: [
      "Family holidays and weekend getaways",
      "One-way drops to Mumbai, Nashik, Kolhapur or Goa",
      "Business trips across cities",
      "Wedding and event travel",
    ],
    faqs: [
      {
        question: "Can I book a one-way drop?",
        answer:
          "Yes. Tell us the pickup and destination and we will quote for the one-way journey you actually need.",
      },
      {
        question: "Are tolls and permits included?",
        answer:
          "They vary by route. We explain exactly what is included in your quote before you confirm.",
      },
      {
        question: "Can the chauffeur wait at my destination?",
        answer:
          "Yes. Waiting and overnight halts for multi-day trips are agreed with you at the time of booking.",
      },
    ],
    booking: {
      tripType: "Round Trip",
      notes: "Outstation car hire enquiry",
    },
  },
  {
    slug: "airport-pickup-drop",
    title: "Airport Pickup & Drop in Pune",
    tag: "Most popular",
    tagline: "On-time transfers for Pune, Mumbai and Shirdi airports.",
    summary:
      "Reliable airport pickups and drops with flight tracking, clear fares and a chauffeur who is there when you land.",
    intro: [
      "Airport trips need punctuality more than anything else. We schedule your pickup around your flight time and traffic, so you are not hurrying to the terminal or waiting outside it.",
      "For arrivals, share your flight number when booking and the chauffeur tracks it, adjusting for any delay. We handle Pune (PNQ) transfers as well as longer drives to Mumbai (BOM) and Shirdi (SAG).",
    ],
    whatYouGet: [
      "Pickup and drop for Pune, Mumbai and Shirdi airports",
      "Flight tracking for arrivals",
      "Buffer time planned around traffic",
      "Help with luggage and a courteous chauffeur",
      "Fixed fare confirmed before travel",
    ],
    idealFor: [
      "Early-morning and late-night flights",
      "Family airport runs with heavy luggage",
      "Corporate guest pickups",
      "Group arrivals needing an MPV or tempo traveller",
    ],
    faqs: [
      {
        question: "Do you track my flight?",
        answer:
          "Yes. Share your flight number and we plan the pickup around your actual arrival time.",
      },
      {
        question: "How early should I leave for an airport drop?",
        answer:
          "We recommend leaving with a comfortable buffer. Tell us your flight time and we suggest the right pickup time for your route.",
      },
      {
        question: "Do you serve Mumbai airport from Pune?",
        answer:
          "Yes. Pune to Mumbai airport transfers run on the Expressway, with extra buffer time for city traffic.",
      },
    ],
    booking: {
      tripType: "Airport Transfer",
      notes: "Airport pickup / drop enquiry",
    },
  },
  {
    slug: "tour-packages",
    title: "Tour & Pilgrimage Packages from Pune",
    tag: "Family special",
    tagline: "Chauffeur-driven tours with the road details handled.",
    summary:
      "Shirdi, Ashtavinayak, Mahabaleshwar, Goa and custom itineraries planned around your pace.",
    intro: [
      "A good tour is about the places, not the logistics. We plan the vehicle, route, daily driving time and halts so you can focus on darshan, family time or sightseeing.",
      "Choose a popular itinerary or ask for a custom one. We build the route around your dates, group size and how much you want to see each day.",
    ],
    whatYouGet: [
      "Popular circuits: Shirdi, Ashtavinayak, Mahabaleshwar, Goa and more",
      "Custom itineraries for your dates and group",
      "Chauffeur with local route knowledge",
      "Vehicle sized to your group, from sedan to tempo traveller",
      "Transparent quote before you commit",
    ],
    idealFor: [
      "Families and multi-generation groups",
      "Society, office and friends’ group trips",
      "Pilgrimage yatras",
      "Weekend and long-weekend holidays",
    ],
    faqs: [
      {
        question: "Do the packages include hotels?",
        answer:
          "Our service covers the vehicle and chauffeur. Hotel arrangements can be discussed on request and are confirmed separately.",
      },
      {
        question: "Can you customise a route?",
        answer:
          "Yes. Share the places you want to visit and your dates, and we will propose a route with sensible daily driving times.",
      },
      {
        question: "Which vehicle is best for a group of ten?",
        answer:
          "A tempo traveller is usually the best fit for groups of around ten or more, depending on luggage.",
      },
    ],
    booking: {
      tripType: "Round Trip",
      drop: "Tour package",
      notes: "Tour and pilgrimage package enquiry",
      enquiry: true,
    },
  },
  {
    slug: "corporate-event-travel",
    title: "Corporate & Event Travel in Pune",
    tag: "Premium",
    tagline: "Professional cars for meetings, guests and celebrations.",
    summary:
      "Executive cars and group vehicles for business guests, weddings, conferences and company outings.",
    intro: [
      "Corporate and event travel depends on punctuality and a professional presentation. We provide clean vehicles and well-mannered chauffeurs for client pickups, staff travel and event days.",
      "For weddings and group events, we can arrange several vehicles for the same schedule so guests move together and on time.",
    ],
    whatYouGet: [
      "Executive sedans, SUVs and MPVs for guests",
      "Tempo travellers for team and baraat movement",
      "Single point of contact for multi-vehicle bookings",
      "Scheduled pickups for events and conferences",
      "Quotes suitable for company approval",
    ],
    idealFor: [
      "Client and visiting-executive travel",
      "Conferences and off-sites",
      "Weddings and family events",
      "Regular staff or guest transfers",
    ],
    faqs: [
      {
        question: "Can you handle multiple vehicles on the same day?",
        answer:
          "Yes. Tell us the schedule and the number of guests and we will arrange a fleet to match.",
      },
      {
        question: "Can we get a written quote?",
        answer:
          "Yes. Share your requirement on WhatsApp or email and we will send a clear quote you can use for approval.",
      },
      {
        question: "Do you provide regular monthly service?",
        answer:
          "Contact us with your requirement and we will discuss what regular arrangement is possible.",
      },
    ],
    booking: {
      tripType: "Local Rental",
      drop: "Corporate / event travel",
      notes: "Corporate and event travel enquiry",
      enquiry: true,
    },
  },
];

export function getServicePage(slug: string) {
  return servicePages.find((service) => service.slug === slug);
}

/* ------------------------------------------------------------------ */
/* Payment options (confirm with the client before launch)               */
/* ------------------------------------------------------------------ */

export const paymentMethods: { title: string; text: string }[] = [
  {
    title: "UPI",
    text: "Pay with any UPI app such as Google Pay, PhonePe or Paytm. We share the UPI details on WhatsApp.",
  },
  {
    title: "Cash",
    text: "Pay the chauffeur or our team in cash at the time agreed in your booking confirmation.",
  },
  {
    title: "Bank transfer",
    text: "Pay by NEFT / IMPS. Bank details are shared on request when your booking is confirmed.",
  },
];
