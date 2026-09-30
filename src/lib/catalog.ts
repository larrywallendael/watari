// Knowledge the agent reasons over. Deterministic, versioned, auditable.
import type { ChannelId } from "./types";

export const DEMO_NOW = "2026-09-30T18:20:00+02:00";

// Signal categories. art9 = special-category data (GDPR Art. 9): never used for inference.
export const SIGNAL_CATEGORIES: Record<string, { label: string; art9?: boolean; stress?: boolean; noise?: boolean }> = {
  notary: { label: "Notary payment" },
  removal: { label: "Removal company" },
  utility_final: { label: "Utility final bill" },
  utility_new: { label: "New utility contract" },
  furniture: { label: "Furniture spend spike" },
  rent_new: { label: "New rent beneficiary" },
  address_search: { label: "Searched 'address change' in app" },
  funeral: { label: "Funeral home payment" },
  estate_notice: { label: "Estate / inheritance notice" },
  baby_store: { label: "Baby store purchase" },
  childcare: { label: "Kind en Gezin / childcare registration" },
  salary_new_employer: { label: "Salary from new employer" },
  car_dealer: { label: "Car dealer deposit" },
  car_quote_view: { label: "Viewed car insurance page" },
  kbo_registration: { label: "KBO company registration fee" },
  accountant: { label: "Accountant fee" },
  travel_booking: { label: "Travel booking" },
  overdraft: { label: "Overdraft trend", stress: true },
  groceries: { label: "Groceries", noise: true },
  salary_regular: { label: "Regular salary", noise: true },
  pharmacy: { label: "Pharmacy", art9: true },
  hospital: { label: "Hospital", art9: true },
  union: { label: "Trade union fee", art9: true },
};

export type Sensitivity = "normal" | "sensitive" | "critical";

export interface EventDef {
  id: string;
  label: string;
  evidence: Record<string, number>; // category -> weight
  sensitivity: Sensitivity;
  urgency: number; // 0..1
  bundle: string[]; // candidate products, ordered
  muteDays?: number;
}

export const EVENTS: EventDef[] = [
  { id: "moving", label: "Moving house", sensitivity: "normal", urgency: 0.8,
    evidence: { notary: 0.45, removal: 0.4, rent_new: 0.4, utility_final: 0.3, utility_new: 0.25, furniture: 0.15, address_search: 0.25 },
    bundle: ["address_change", "home_insurance", "energy_transfer", "parking_zone", "mortgage_review"] },
  { id: "bereavement", label: "Loss of a loved one", sensitivity: "critical", urgency: 0.9, muteDays: 42,
    evidence: { funeral: 0.8, estate_notice: 0.5 },
    bundle: ["estate_service", "advisor_callback"] },
  { id: "new_baby", label: "New baby", sensitivity: "sensitive", urgency: 0.6,
    evidence: { childcare: 0.6, baby_store: 0.35 },
    bundle: ["birth_premium_check", "child_savings", "family_insurance"] },
  { id: "new_job", label: "New job", sensitivity: "normal", urgency: 0.4,
    evidence: { salary_new_employer: 0.75 },
    bundle: ["pension_savings", "salary_account_switch"] },
  { id: "car_purchase", label: "Buying a car", sensitivity: "normal", urgency: 0.7,
    evidence: { car_dealer: 0.6, car_quote_view: 0.3 },
    bundle: ["car_insurance", "car_loan", "mobility_bundle"] },
  { id: "business_start", label: "Starting a business", sensitivity: "normal", urgency: 0.6,
    evidence: { kbo_registration: 0.7, accountant: 0.3 },
    bundle: ["business_account", "business_insurance", "advisor_callback"] },
  { id: "travel", label: "Upcoming trip", sensitivity: "normal", urgency: 0.5,
    evidence: { travel_booking: 0.65 },
    bundle: ["travel_insurance", "card_travel_notice"] },
];

export interface Product { id: string; title: string; kind: "service" | "product" | "partner" | "help"; commercial: boolean; }

export const CATALOG: Record<string, Product> = {
  address_change: { id: "address_change", title: "Address change at KBC + KBC Insurance", kind: "service", commercial: false },
  home_insurance: { id: "home_insurance", title: "Home insurance quote", kind: "product", commercial: true },
  energy_transfer: { id: "energy_transfer", title: "Energy contract transfer", kind: "partner", commercial: false },
  parking_zone: { id: "parking_zone", title: "Parking zone in KBC Mobile", kind: "service", commercial: false },
  mortgage_review: { id: "mortgage_review", title: "Mortgage follow-up with advisor", kind: "product", commercial: true },
  estate_service: { id: "estate_service", title: "We handle the estate paperwork", kind: "help", commercial: false },
  advisor_callback: { id: "advisor_callback", title: "Call from a personal advisor", kind: "help", commercial: false },
  birth_premium_check: { id: "birth_premium_check", title: "Groeipakket birth premium check", kind: "help", commercial: false },
  child_savings: { id: "child_savings", title: "Savings account for your child", kind: "product", commercial: true },
  family_insurance: { id: "family_insurance", title: "Add your child to family cover", kind: "product", commercial: true },
  pension_savings: { id: "pension_savings", title: "Pension savings with tax benefit", kind: "product", commercial: true },
  salary_account_switch: { id: "salary_account_switch", title: "Salary lands at KBC, switch in 1 tap", kind: "service", commercial: false },
  car_insurance: { id: "car_insurance", title: "Car insurance, pre-filled from your deposit", kind: "product", commercial: true },
  car_loan: { id: "car_loan", title: "Car loan simulation", kind: "product", commercial: true },
  mobility_bundle: { id: "mobility_bundle", title: "Parking + tolls + charging in KBC Mobile", kind: "service", commercial: false },
  business_account: { id: "business_account", title: "Business account opened in 5 min", kind: "product", commercial: true },
  business_insurance: { id: "business_insurance", title: "Starter liability insurance", kind: "product", commercial: true },
  travel_insurance: { id: "travel_insurance", title: "Travel insurance for this trip", kind: "product", commercial: true },
  card_travel_notice: { id: "card_travel_notice", title: "Card ready for abroad", kind: "service", commercial: false },
};

export const CHANNELS: Record<ChannelId, { label: string; short: string }> = {
  app_push: { label: "KBC Mobile push", short: "Push" },
  kate_chat: { label: "Kate in-app", short: "Kate" },
  email: { label: "E-mail", short: "Mail" },
  voice_call: { label: "Kate voice call", short: "Voice" },
  advisor: { label: "Personal advisor", short: "Advisor" },
};

export const RULES = {
  confidenceThreshold: 0.6,
  fatigueCap: 3, // max proactive contacts per 30 days unless urgency >= overrideUrgency
  overrideUrgency: 0.85,
  lookbackDays: 45,
};
