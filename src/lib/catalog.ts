// Knowledge the agent reasons over. Deterministic, versioned, auditable.
import type { ChannelId } from "./types";

export const DEMO_NOW = "2026-09-30T18:20:00+02:00";

// Signal categories. art9 = special-category data (GDPR Art. 9): never used for inference.
export const SIGNAL_CATEGORIES: Record<string, { label: string; art9?: boolean; stress?: boolean; noise?: boolean; live?: boolean; night?: boolean }> = {
  notary: { label: "Notary payment" },
  removal: { label: "Removal company" },
  utility_final: { label: "Utility final bill" },
  utility_new: { label: "New utility contract" },
  furniture: { label: "Furniture spend spike" },
  rent_new: { label: "New rent beneficiary" },
  address_search: { label: "Searched 'address change' in app" },
  location_shift: { label: "Evenings in a new city" },
  tenant_policy_end: { label: "Tenant policy ending" },
  funeral: { label: "Funeral home payment" },
  florist: { label: "Florist payment" },
  pension_stopped: { label: "Expected pension stopped" },
  managed_account: { label: "Repeatedly opened a managed account" },
  estate_notice: { label: "Estate / inheritance notice" },
  birth_allowance: { label: "Groeipakket birth allowance" },
  baby_store: { label: "Baby store purchase" },
  diapers: { label: "Repeated diaper purchases" },
  childcare: { label: "Kind en Gezin / childcare registration" },
  first_salary: { label: "First salary ever" },
  salary_new_employer: { label: "Salary from new employer" },
  broker_transfer: { label: "Money leaving to a broker" },
  etf_question: { label: "Asked Kate about investing" },
  idle_account: { label: "Idle student account" },
  car_dealer: { label: "Car dealer deposit" },
  car_quote_view: { label: "Viewed car insurance page" },
  kbo_registration: { label: "KBO company registration fee" },
  accountant: { label: "Accountant fee" },
  travel_booking: { label: "Travel booking" },
  trial_converting: { label: "Free trial about to convert" },
  unused_subscription: { label: "Paid subscription, unused" },
  checkout_now: { label: "At a checkout right now", live: true },
  rent_missing: { label: "Expected rent not received" },
  mortgage_due: { label: "Mortgage debit due" },
  atm_abroad_night: { label: "ATM abroad, middle of the night", night: true },
  location_mismatch: { label: "Phone and card in different countries" },
  pin_declined: { label: "Wrong PIN attempt" },
  overdraft: { label: "Overdraft trend", stress: true },
  groceries: { label: "Groceries", noise: true },
  salary_regular: { label: "Regular salary", noise: true },
  streaming: { label: "Streaming subscription", noise: true },
  payment_history: { label: "Payment history", noise: true },
  pharmacy: { label: "Pharmacy", art9: true },
  hospital: { label: "Hospital / maternity ward", art9: true },
  union: { label: "Trade union fee", art9: true },
};

export type Sensitivity = "normal" | "sensitive" | "critical" | "emergency";

export interface EventDef {
  id: string;
  label: string;
  evidence: Record<string, number>; // category -> weight
  sensitivity: Sensitivity;
  urgency: number; // 0..1
  bundle: string[];
  channelFit: Partial<Record<ChannelId, number>>; // how well each channel suits this kind of moment
  timing?: string; // override for delivery timing
  muteDays?: number;
}

export const EVENTS: EventDef[] = [
  { id: "moving", label: "Moving house", sensitivity: "normal", urgency: 0.8,
    evidence: { notary: 0.45, removal: 0.4, rent_new: 0.4, utility_final: 0.3, utility_new: 0.25, furniture: 0.15, address_search: 0.25, location_shift: 0.2, tenant_policy_end: 0.25 },
    bundle: ["address_change", "home_insurance", "energy_transfer", "parking_zone"],
    channelFit: { push: 1, whatsapp: 0.7, mail: 0.4, call: 0.05, messenger: 0.1, browser: 0.1 } },
  { id: "bereavement", label: "Loss of a loved one", sensitivity: "critical", urgency: 0.9, muteDays: 30, timing: "Saturday 10:00, after 5 quiet days",
    evidence: { funeral: 0.8, florist: 0.15, pension_stopped: 0.45, managed_account: 0.15, estate_notice: 0.5 },
    bundle: ["death_registration", "stop_debits", "estate_account", "pension_notice", "adviser_call"],
    channelFit: { push: 0.02, whatsapp: 0.1, mail: 1, call: 0.45, messenger: 0, browser: 0 } },
  { id: "new_baby", label: "New family member", sensitivity: "sensitive", urgency: 0.6,
    evidence: { birth_allowance: 0.75, childcare: 0.6, baby_store: 0.35, diapers: 0.2 },
    bundle: ["child_benefit_route", "family_insurance", "child_savings", "birth_docs"],
    channelFit: { push: 0.6, whatsapp: 1, mail: 0.45, call: 0.02, messenger: 0.2, browser: 0 } },
  { id: "first_job", label: "Life stage: first job", sensitivity: "normal", urgency: 0.45,
    evidence: { first_salary: 0.7, salary_new_employer: 0.5, broker_transfer: 0.3, etf_question: 0.3, idle_account: 0.15 },
    bundle: ["pay_split", "etf_plan", "account_upgrade", "pension_savings"],
    channelFit: { push: 0.5, whatsapp: 0.35, mail: 1, call: 0.02, messenger: 0.1, browser: 0.2 } },
  { id: "subscription_creep", label: "Unused subscriptions", sensitivity: "normal", urgency: 0.7,
    evidence: { trial_converting: 0.45, unused_subscription: 0.4, checkout_now: 0.35 },
    bundle: ["cancel_trial", "cancel_unused", "savings_sweep"],
    channelFit: { push: 0.45, whatsapp: 0.2, mail: 0.15, call: 0, messenger: 0.1, browser: 0.6 } },
  { id: "missing_rent", label: "Missing inflow, mortgage due", sensitivity: "normal", urgency: 0.75,
    evidence: { rent_missing: 0.7, mortgage_due: 0.35 },
    bundle: ["tenant_nudge_draft", "pay_link", "inflow_watch"],
    channelFit: { push: 0.7, whatsapp: 0.5, mail: 0.2, call: 0.05, messenger: 1, browser: 0 } },
  { id: "card_emergency", label: "Possible card fraud abroad", sensitivity: "emergency", urgency: 1,
    evidence: { atm_abroad_night: 0.55, location_mismatch: 0.45, pin_declined: 0.35 },
    bundle: ["card_freeze", "dispute", "card_reissue"],
    channelFit: { push: 0.3, whatsapp: 0.2, mail: 0, call: 1.3, messenger: 0, browser: 0 } },
  { id: "car_purchase", label: "Buying a car", sensitivity: "normal", urgency: 0.7,
    evidence: { car_dealer: 0.6, car_quote_view: 0.3 },
    bundle: ["car_insurance", "car_loan", "mobility_bundle"],
    channelFit: { push: 1, whatsapp: 0.6, mail: 0.5, call: 0.05, messenger: 0.1, browser: 0.3 } },
  { id: "business_start", label: "Starting a business", sensitivity: "normal", urgency: 0.6,
    evidence: { kbo_registration: 0.7, accountant: 0.3 },
    bundle: ["business_account", "business_insurance", "adviser_call"],
    channelFit: { push: 0.6, whatsapp: 0.4, mail: 1, call: 0.2, messenger: 0.1, browser: 0.2 } },
  { id: "travel", label: "Upcoming trip", sensitivity: "normal", urgency: 0.5,
    evidence: { travel_booking: 0.65 },
    bundle: ["travel_insurance", "card_travel_notice"],
    channelFit: { push: 1, whatsapp: 0.6, mail: 0.5, call: 0, messenger: 0.1, browser: 0.2 } },
];

export interface Product { id: string; title: string; kind: "service" | "product" | "partner" | "help"; commercial: boolean; }

const P = (id: string, title: string, kind: Product["kind"], commercial = false): [string, Product] => [id, { id, title, kind, commercial }];
export const CATALOG: Record<string, Product> = Object.fromEntries([
  P("address_change", "Address change at KBC, KBC Insurance and the municipality", "service"),
  P("home_insurance", "Home insurance quote, pre-filled", "product", true),
  P("energy_transfer", "Fluvius contract moved to the new address", "partner"),
  P("parking_zone", "Resident parking permit", "partner"),
  P("death_registration", "Death registered at all Belgian banks (Febelfin)", "help"),
  P("stop_debits", "Stop direct debits on the account", "help"),
  P("estate_account", "Estate account shared with the notary", "help"),
  P("pension_notice", "Pension service notified", "help"),
  P("adviser_call", "Call from a personal adviser", "help"),
  P("child_benefit_route", "Groeipakket allowance routed to the child", "service"),
  P("family_insurance", "Child added to family cover", "product", true),
  P("child_savings", "Savings account for the child", "product", true),
  P("birth_docs", "Birth documents filed in Doccle", "service"),
  P("pay_split", "Salary split at source (save, invest, spend)", "service"),
  P("etf_plan", "Low-fee ETF plan", "product", true),
  P("account_upgrade", "Student account upgraded", "product", true),
  P("pension_savings", "Pension savings with tax benefit", "product", true),
  P("cancel_trial", "Cancel the trial before it converts", "service"),
  P("cancel_unused", "Cancel the unused subscription", "service"),
  P("savings_sweep", "Move the saving to a savings pot", "service"),
  P("tenant_nudge_draft", "Friendly reminder drafted for you to send", "service"),
  P("pay_link", "Payconiq pay-link for the rent", "service"),
  P("inflow_watch", "Watch for the payment and confirm", "service"),
  P("card_freeze", "Freeze the card now", "help"),
  P("dispute", "Dispute the withdrawal", "help"),
  P("card_reissue", "New card shipped", "help"),
  P("car_insurance", "Car insurance, pre-filled from your deposit", "product", true),
  P("car_loan", "Car loan simulation", "product", true),
  P("mobility_bundle", "Parking, tolls and charging in KBC Mobile", "service"),
  P("business_account", "Business account opened in 5 min", "product", true),
  P("business_insurance", "Starter liability insurance", "product", true),
  P("travel_insurance", "Travel insurance for this trip", "product", true),
  P("card_travel_notice", "Card ready for abroad", "service"),
]);

export const CHANNELS: Record<ChannelId, { label: string; short: string }> = {
  push: { label: "Lock screen push", short: "Push" },
  whatsapp: { label: "WhatsApp", short: "WhatsApp" },
  mail: { label: "E-mail", short: "Mail" },
  call: { label: "Phone call", short: "Call" },
  messenger: { label: "Messenger draft", short: "Messenger" },
  browser: { label: "Browser, at checkout", short: "Browser" },
};

export const RULES = {
  confidenceThreshold: 0.6,
  fatigueCap: 3, // max proactive contacts per 30 days unless urgency >= overrideUrgency
  overrideUrgency: 0.85,
  lookbackDays: 45,
  quietHours: [22, 7] as [number, number],
};
