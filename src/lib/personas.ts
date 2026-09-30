// Synthetic customers. No real person, no real account data.
import type { Persona } from "./types";

const prefs = (app: number, kate: number, email: number, voice: number, advisor: number) =>
  ({ app_push: app, kate_chat: kate, email, voice_call: voice, advisor });

export const SEED_PERSONAS: Persona[] = [
  {
    id: "lotte", name: "Lotte Peeters", age: 31, city: "Gent → Leuven", segment: "Young professional",
    bio: "UX designer, rents in Gent, just signed for a flat in Leuven. Uses KBC Mobile daily around 8h and 21h.",
    products: ["current_account", "credit_card", "fire_insurance_rental"],
    consent: { life_events: true, cross_sell: true, voice: true, marketing: true },
    channelPrefs: prefs(0.9, 0.7, 0.3, 0.6, 0.2), appOpenHours: [8, 12, 19, 21], contacts30d: 1,
    signals: [
      { id: "l1", date: "2026-09-02", source: "bank", merchant: "Notaris Vandamme Leuven", amount: -12500, category: "notary", text: "Deposit to notary, Leuven" },
      { id: "l2", date: "2026-09-14", source: "app", category: "address_search", text: "Searched 'adres wijzigen' in KBC Mobile" },
      { id: "l3", date: "2026-09-18", source: "bank", merchant: "Verhuisfirma De Kerf", amount: -890, category: "removal", text: "Removal company, booking 1 Nov" },
      { id: "l4", date: "2026-09-22", source: "bank", merchant: "Colruyt Gent", amount: -64.2, category: "groceries", text: "Groceries" },
      { id: "l5", date: "2026-09-25", source: "bank", merchant: "IKEA Zaventem", amount: -1740, category: "furniture", text: "Furniture, 6x usual monthly spend" },
      { id: "l6", date: "2026-09-27", source: "bank", merchant: "Fluvius", amount: -212, category: "utility_final", text: "Energy final settlement, Gent address" },
      { id: "l7", date: "2026-09-28", source: "bank", merchant: "Apotheek Sint-Pieters", amount: -18.4, category: "pharmacy", text: "Pharmacy" },
    ],
  },
  {
    id: "karim", name: "Karim El Idrissi", age: 52, city: "Antwerpen", segment: "Affluent family",
    bio: "Logistics manager, two teenagers. Normally targeted with savings and investment campaigns.",
    products: ["current_account", "savings", "home_insurance", "mortgage", "car_insurance"],
    consent: { life_events: true, cross_sell: true, voice: false, marketing: true },
    channelPrefs: prefs(0.6, 0.5, 0.7, 0.1, 0.8), appOpenHours: [7, 18], contacts30d: 2,
    signals: [
      { id: "k1", date: "2026-09-10", source: "bank", merchant: "Salaris Katoen Natie", amount: 4850, category: "salary_regular", text: "Monthly salary" },
      { id: "k2", date: "2026-09-21", source: "bank", merchant: "Uitvaartzorg Verbraecken", amount: -6200, category: "funeral", text: "Payment to funeral home" },
      { id: "k3", date: "2026-09-24", source: "external", category: "estate_notice", text: "Notary letter: estate settlement opened" },
      { id: "k4", date: "2026-09-26", source: "bank", merchant: "Delhaize Berchem", amount: -121, category: "groceries", text: "Groceries" },
    ],
  },
  {
    id: "sofie", name: "Sofie Maes", age: 34, city: "Mechelen", segment: "Young family",
    bio: "Teacher. Has switched marketing off in Privacy op maat but allows life-event help.",
    products: ["current_account", "savings", "home_insurance"],
    consent: { life_events: true, cross_sell: true, voice: false, marketing: false },
    channelPrefs: prefs(0.8, 0.6, 0.5, 0.0, 0.3), appOpenHours: [7, 20, 22], contacts30d: 0,
    signals: [
      { id: "s1", date: "2026-09-05", source: "bank", merchant: "Dreambaby Mechelen", amount: -389, category: "baby_store", text: "Baby store: pram and car seat" },
      { id: "s2", date: "2026-09-19", source: "bank", merchant: "AZ Sint-Maarten", amount: -145, category: "hospital", text: "Hospital invoice" },
      { id: "s3", date: "2026-09-23", source: "external", merchant: "Kind en Gezin", category: "childcare", text: "Childcare registration fee" },
    ],
  },
  {
    id: "tom", name: "Tom Janssens", age: 41, city: "Hasselt", segment: "Mass retail",
    bio: "New job at a Limburg scale-up. Already got 3 KBC promos this month and ignored all of them.",
    products: ["current_account", "credit_card"],
    consent: { life_events: true, cross_sell: true, voice: false, marketing: true },
    channelPrefs: prefs(0.4, 0.3, 0.6, 0.0, 0.1), appOpenHours: [12], contacts30d: 3,
    signals: [
      { id: "t1", date: "2026-09-25", source: "bank", merchant: "Salaris Hasselt Robotics BV", amount: 3620, category: "salary_new_employer", text: "First salary from new employer" },
      { id: "t2", date: "2026-09-26", source: "bank", merchant: "ACV", amount: -18, category: "union", text: "Union membership fee" },
      { id: "t3", date: "2026-09-27", source: "bank", merchant: "Aldi Hasselt", amount: -48, category: "groceries", text: "Groceries" },
    ],
  },
];
