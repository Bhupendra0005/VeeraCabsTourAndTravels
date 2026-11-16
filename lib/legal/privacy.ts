import type { LegalSection } from "@/lib/legal/content";
import type { SiteData } from "@/lib/site";

/** Shown at the top of the Privacy Policy. Change it whenever the policy text changes. */
export const PRIVACY_UPDATED = "13 November 2026";

/**
 * DRAFT wording that describes what this website and booking system really do with personal data (name, phone, email,
 * addresses, payments, emails, captcha, address suggestions). Have the owner (and a lawyer) review it before launch, and
 * update it if a new tool is added (analytics, a new payment or email provider, ...).
 */
export function privacySections(site: SiteData): LegalSection[] {
  const contact = `${site.name}, ${site.address.full}. Email ${site.email}, phone ${site.primaryPhone.display} or ${site.secondaryPhone.display}.`;
  return [
    {
      title: "1. Who we are",
      body: [
        `${site.name} ("we", "us") is a cab and tour service based in Pune, Maharashtra. This policy explains what personal information we collect through this website, why we collect it, who we share it with and what choices you have.`,
        `You can reach us at: ${contact}`,
      ],
    },
    {
      title: "2. Information we collect",
      body: [
        "Booking details: traveller name, mobile number, email address, pickup and drop addresses, travel date and time, number of passengers and bags, the vehicle you choose, and any special requests, coupon code or extra stops you add.",
        "GST details: if you ask for a GST invoice, the company name and GSTIN you enter.",
        "Account details: your email address (you sign in with a one-time code sent to it, there is no password) and, if you save them, your name, mobile number and city under My profile.",
        "Enquiries: the name, phone number and message you send through the Contact form or an enquiry button.",
        "Reviews: the ratings and comment you give after a trip. On the website only your first name and the initial of your last name are shown.",
        "Payment records: the amount, status and reference numbers of your payments and refunds. Your card, UPI or bank details are entered on Razorpay's secure payment window and are never seen or stored by us.",
        "Technical information: when you request a login code or submit a form we use a protected (hashed) form of your IP address only to stop misuse such as spam and repeated attempts. We do not build advertising profiles.",
      ],
    },
    {
      title: "3. How we use your information",
      body: [
        "To confirm and run your booking, take payment, send your ticket, invoice and booking messages, assign a driver and cab, and give support before, during and after your trip.",
        "To send the one-time code you use to sign in, and to keep your account and My Bookings safe.",
        "To answer your enquiries and to show genuine reviews of our vehicles.",
        "To keep accounting, GST and legal records, to prevent fraud and misuse, and to improve how the service works.",
        "We send you messages about your own bookings. We do not send promotional messages unless you ask for them.",
      ],
    },
    {
      title: "4. Who we share it with",
      body: [
        "Your driver receives your name, mobile number, pickup point and trip details so that the trip can happen. You also receive your driver's name, phone number and cab number.",
        "We use trusted service providers to run the website: Razorpay (payments and refunds), Supabase (secure database hosting), Brevo (sending emails), Cloudflare Turnstile (checks that a form is filled by a person, not a bot), ImageKit (images on the website), and Google Maps (the map on the Contact page). Address suggestions while you type use OpenStreetMap data through a search service; the request is sent from our server so your IP address is not passed on. These providers receive only what is needed for their task and may process data on servers outside India.",
        "If you tap a WhatsApp or call button, the conversation takes place on WhatsApp or the phone network under their own terms and privacy policies.",
        "We do not sell your personal information. We may disclose it when the law requires, or to protect our rights, our drivers and other customers.",
      ],
    },
    {
      title: "5. Cookies",
      body: [
        "We use only the cookies the site needs to work: a secure sign-in cookie that keeps you logged in to My Bookings, and the cookies set by Cloudflare Turnstile and Razorpay to protect and complete a form or a payment. We do not use advertising or tracking cookies.",
        "The embedded Google map may set its own cookies when you open the Contact page.",
        "You can block cookies in your browser, but you will then not be able to sign in or book online.",
      ],
    },
    {
      title: "6. How long we keep it",
      body: [
        "Booking, invoice and payment records are kept for as long as the law requires for accounting and tax purposes. Other information, such as enquiries and profile details, is kept only as long as it is needed for the reason it was given, or until you ask us to delete it.",
        "When we no longer need information, we delete it or make it anonymous.",
      ],
    },
    {
      title: "7. Security",
      body: [
        "We protect your information with an encrypted (HTTPS) connection, hashed one-time codes and IP addresses, restricted staff access, and a payment partner that follows card-industry security standards.",
        "No website can promise perfect security. Please keep your email account safe and never share your login code with anyone.",
      ],
    },
    {
      title: "8. Your choices and rights",
      body: [
        "You can see and update your name, mobile number and city under My profile at any time, and see your bookings under My Bookings.",
        "You can ask us to correct your information, to give you a copy of it, or to delete it (we may need to keep records that the law requires), and you can withdraw your consent to us using it for anything other than your booking. Write or call us using the details below.",
        "Cancelling a booking is done from My Bookings and does not by itself delete your records.",
      ],
    },
    {
      title: "9. Children",
      body: [
        "Our online booking is meant for adults. If you book for a child, you confirm that you are the parent or guardian and agree to this policy on their behalf.",
      ],
    },
    {
      title: "10. Changes to this policy",
      body: [
        `We may update this policy when our service or the law changes. The latest version is always on this page, with the date at the top (currently ${PRIVACY_UPDATED}). If a change is significant, we will tell you on the website or by email.`,
      ],
    },
    {
      title: "11. Contact and complaints",
      body: [
        `For any question, request or complaint about your personal information, contact: ${contact}`,
        "We will reply as soon as we can, normally within a few working days.",
      ],
    },
  ];
}
