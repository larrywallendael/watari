// Synthetic customers mirroring the 7 wireframe stories. No real person, no real account data.
import type { Persona } from "./types";

const prefs = (push: number, whatsapp: number, mail: number, call: number, messenger: number, browser: number) =>
  ({ push, whatsapp, mail, call, messenger, browser });
const C = (o: Partial<Persona["consent"]> = {}) => ({ life_events: true, cross_sell: true, voice: false, marketing: true, emergency: false, ...o });

export const SEED_PERSONAS: Persona[] = [
  { id: "lotte", scenario: "move", name: "Lotte Peeters", age: 31, city: "Gent → Leuven", segment: "Designer · buying first flat",
    bio: "Renting in Gent, just signed for a flat in Leuven. Opens KBC Mobile daily around 8h and 19h.",
    products: ["current_account", "credit_card", "tenant_insurance"], consent: C({ voice: true }),
    channelPrefs: prefs(0.92, 0.65, 0.4, 0.3, 0.2, 0.5), appOpenHours: [8, 12, 19, 21], contacts30d: 1, localHour: 18.3,
    signals: [
      { id: "l1", date: "2026-09-12", source: "bank", merchant: "Notary Van Damme", amount: -24000, category: "notary", text: "Down payment, flat Leuven" },
      { id: "l2", date: "2026-09-18", source: "bank", merchant: "Verhuisfirma Mertens", amount: -1180, category: "removal", text: "Removal firm, deposit" },
      { id: "l3", date: "2026-09-25", source: "external", merchant: "Fluvius", amount: -212, category: "utility_final", text: "Final meter reading Gent" },
      { id: "l4", date: "2026-09-28", source: "app", category: "location_shift", text: "Evenings in Leuven, 9 of last 14 days" },
      { id: "l5", date: "2026-09-29", source: "insurance", category: "tenant_policy_end", text: "Tenant policy Gent ends with the old lease" },
      { id: "l6", date: "2026-09-22", source: "bank", merchant: "Apotheek Sint-Pieters", amount: -18.4, category: "pharmacy", text: "Pharmacy" },
    ] },
  { id: "karim", scenario: "grief", name: "Karim El Amrani", age: 52, city: "Antwerpen", segment: "Teacher · lost his mother",
    bio: "Holds a proxy on his mother's account. Prefers phone over app. Normally targeted by savings campaigns.",
    products: ["current_account", "savings", "home_insurance", "mortgage"], consent: C({ voice: true }),
    channelPrefs: prefs(0.5, 0.3, 0.8, 0.75, 0.1, 0.2), appOpenHours: [7, 18], contacts30d: 2, localHour: 9.9,
    signals: [
      { id: "k1", date: "2026-09-21", source: "bank", merchant: "Uitvaartzorg De Smet", amount: -4850, category: "funeral", text: "Funeral services" },
      { id: "k2", date: "2026-09-22", source: "bank", merchant: "Bloemen Flora", amount: -180, category: "florist", text: "Florist, Antwerpen" },
      { id: "k3", date: "2026-09-26", source: "bank", category: "pension_stopped", text: "Pension to mother's account stopped, first time in 9 years" },
      { id: "k4", date: "2026-09-28", source: "app", category: "managed_account", text: "Opened mother's account 6x this week, no action" },
    ] },
  { id: "maes", scenario: "baby", name: "Sofie & Jonas Maes", age: 33, city: "Mechelen", segment: "Young parents · baby Mila",
    bio: "Joint account, KBC mortgage since 2021. WhatsApp opted in. Marketing switched off in Privacy op maat.",
    products: ["current_account", "savings", "home_insurance", "mortgage", "family_insurance"], consent: C({ marketing: false }),
    channelPrefs: prefs(0.6, 0.9, 0.45, 0.1, 0.2, 0.1), appOpenHours: [7, 11, 22], contacts30d: 0, localHour: 10.9,
    signals: [
      { id: "m1", date: "2026-09-14", source: "bank", merchant: "AZ Sint-Maarten", amount: -640, category: "hospital", text: "Maternity ward" },
      { id: "m2", date: "2026-09-19", source: "bank", merchant: "Groeipakket", amount: 1227, category: "birth_allowance", text: "Birth allowance (kraamgeld)" },
      { id: "m3", date: "2026-09-20", source: "bank", merchant: "Dreambaby", amount: -420, category: "baby_store", text: "Stroller + car seat" },
      { id: "m4", date: "2026-09-27", source: "bank", merchant: "Kruidvat", amount: -38, category: "diapers", text: "Diapers, 3rd time in 10 days" },
    ] },
  { id: "arne", scenario: "job", name: "Arne Claes", age: 24, city: "Leuven", segment: "First job · wants FIRE",
    bio: "Graduated in June. Asked Kate how ETFs work. Still on a student account.",
    products: ["student_account"], consent: C(),
    channelPrefs: prefs(0.5, 0.35, 0.86, 0.05, 0.1, 0.3), appOpenHours: [8, 13, 23], contacts30d: 0, localHour: 8.1,
    signals: [
      { id: "a1", date: "2026-09-25", source: "bank", merchant: "Accenture via SD Worx", amount: 2640, category: "first_salary", text: "First salary" },
      { id: "a2", date: "2026-09-26", source: "bank", merchant: "Trade Republic", amount: -200, category: "broker_transfer", text: "Outgoing to broker" },
      { id: "a3", date: "2026-09-16", source: "app", category: "etf_question", text: "Asked Kate: how do ETFs work?" },
      { id: "a4", date: "2026-09-27", source: "bank", category: "idle_account", text: "Student account idle, €2.1k" },
    ] },
  { id: "nina", scenario: "subs", name: "Nina Jacobs", age: 28, city: "Brussel", segment: "Consultant · subscription creep",
    bio: "Three streaming services and a gym she stopped going to. Browser agent allowed in My Terms.",
    products: ["current_account", "credit_card"], consent: C(),
    channelPrefs: prefs(0.45, 0.25, 0.15, 0.05, 0.1, 0.9), appOpenHours: [9, 21], contacts30d: 1, localHour: 21.2,
    signals: [
      { id: "n1", date: "2026-09-03", source: "bank", merchant: "Netflix", amount: -17.99, category: "streaming", text: "Monthly" },
      { id: "n2", date: "2026-09-27", source: "bank", merchant: "Disney+", amount: -11.99, category: "trial_converting", text: "Trial converts in 3 days, 0 minutes watched" },
      { id: "n3", date: "2026-09-20", source: "bank", merchant: "Basic-Fit", amount: -29.99, category: "unused_subscription", text: "No gym check-in for 7 weeks" },
      { id: "n4", date: "2026-09-30", source: "external", merchant: "HBO Max", category: "checkout_now", text: "Checkout open in the browser, now" },
    ] },
  { id: "marc", scenario: "rent", name: "Marc Wouters", age: 58, city: "Hasselt", segment: "Landlord · one rental flat",
    bio: "Tenant Alexis has paid on the 1st for 14 months. Mortgage on the flat is debited on the 6th.",
    products: ["current_account", "savings", "mortgage", "home_insurance", "investments", "credit_card"], consent: C(),
    channelPrefs: prefs(0.7, 0.5, 0.25, 0.1, 0.9, 0.05), appOpenHours: [7, 9, 20], contacts30d: 0, localHour: 9,
    signals: [
      { id: "r1", date: "2026-09-30", source: "bank", category: "rent_missing", text: "Rent Alexis €850 due on the 1st, day 5, not seen" },
      { id: "r2", date: "2026-09-30", source: "bank", category: "payment_history", text: "14 months on time" },
      { id: "r3", date: "2026-10-01", source: "bank", merchant: "KBC mortgage rental flat", amount: -690, category: "mortgage_due", text: "Debited tomorrow" },
    ] },
  { id: "els", scenario: "family", name: "Els Janssens", age: 49, city: "Brugge", segment: "Mother of Tibo (19)",
    bio: "Tibo is on her family plan and studies in Brussel. She set 'wake me for emergencies' in My Terms.",
    products: ["current_account", "family_cards", "savings"], consent: C({ emergency: true }),
    channelPrefs: prefs(0.6, 0.4, 0.2, 0.7, 0.1, 0.05), appOpenHours: [7, 19], contacts30d: 3, localHour: 3.2,
    signals: [
      { id: "e1", date: "2026-09-30", source: "bank", merchant: "ATM Marrakech", amount: -400, category: "atm_abroad_night", text: "Tibo's card, 03:12 tonight" },
      { id: "e2", date: "2026-09-30", source: "app", category: "location_mismatch", text: "Tibo's phone last seen in Brussel, 2 hours ago" },
      { id: "e3", date: "2026-09-30", source: "bank", category: "pin_declined", text: "2nd attempt, wrong PIN" },
    ] },
  { id: "tom", name: "Tom Janssens", age: 41, city: "Hasselt", segment: "Extra · fatigue-cap test",
    bio: "New job at a scale-up. Already got 3 KBC messages this month and ignored all of them.",
    products: ["current_account", "credit_card"], consent: C(),
    channelPrefs: prefs(0.4, 0.2, 0.6, 0.05, 0.1, 0.1), appOpenHours: [12], contacts30d: 3, localHour: 18.3,
    signals: [
      { id: "t1", date: "2026-09-25", source: "bank", merchant: "Hasselt Robotics BV", amount: 3620, category: "salary_new_employer", text: "First salary from new employer" },
      { id: "t2", date: "2026-09-26", source: "bank", merchant: "ACV", amount: -18, category: "union", text: "Union membership fee" },
    ] },
];
