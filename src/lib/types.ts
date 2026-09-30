export type Source = "bank" | "insurance" | "app" | "external";
export type ChannelId = "push" | "whatsapp" | "mail" | "call" | "messenger" | "browser";

export interface Signal {
  id: string;
  date: string; // ISO date
  source: Source;
  merchant?: string;
  amount?: number; // EUR, negative = outflow
  category?: string; // known signal category; empty for free text -> LLM classifies
  text: string; // human readable description
}

export interface Consent {
  life_events: boolean; // may KBC use signals to detect life moments
  cross_sell: boolean; // may KBC propose products
  voice: boolean; // may Kate call
  marketing: boolean; // promotional push allowed
  emergency?: boolean; // "wake me for emergencies": may break Quiet Hours
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  city: string;
  segment: string;
  bio: string;
  products: string[];
  consent: Consent;
  channelPrefs: Record<ChannelId, number>; // 0..1 learned affinity
  appOpenHours: number[]; // hours the customer usually opens KBC Mobile
  contacts30d: number; // proactive contacts already sent in last 30 days
  localHour?: number; // customer local time for this moment (demo clock)
  scenario?: string; // wireframe scenario this persona drives
  custom?: boolean;
  signals: Signal[];
}

export type Kind =
  | "phase" | "read" | "rule" | "pass" | "block" | "llm" | "tool" | "decision" | "guard" | "done" | "error" | "info";

export interface TraceEvent {
  t: number; // ms since run start
  kind: Kind;
  label: string;
  detail?: string;
  data?: unknown;
}

export interface BundleItem {
  productId: string;
  title: string;
  prefill: string;
}

export type Status = "deliver" | "confirm_first" | "hold" | "suppress";

export interface Decision {
  status: Status;
  event: string | null;
  eventLabel: string | null;
  confidence: number;
  channel: ChannelId | null;
  sendAt: string | null;
  mutedUntil?: string | null;
  bundle: BundleItem[];
  message: { title: string; body: string; cta: string } | null;
  why: string[];
  blockedBy: string[];
  aiWritten: boolean;
}
