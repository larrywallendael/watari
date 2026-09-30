import { z } from "zod";
import { SIGNAL_CATEGORIES } from "./catalog";

const cat = z.string().max(40).refine((c) => c === "" || c in SIGNAL_CATEGORIES, "unknown category").optional();
const txt = (n: number) => z.string().trim().max(n);

export const PersonaInput = z.object({
  name: txt(60).min(1),
  age: z.number().int().min(18).max(110),
  city: txt(60),
  segment: txt(60).default("Custom"),
  bio: txt(300).default(""),
  products: z.array(txt(40)).max(20).default([]),
  consent: z.object({ life_events: z.boolean(), cross_sell: z.boolean(), voice: z.boolean(), marketing: z.boolean(), emergency: z.boolean().optional() }).strict(),
  channelPrefs: z.object({ push: z.number().min(0).max(1), whatsapp: z.number().min(0).max(1), mail: z.number().min(0).max(1), call: z.number().min(0).max(1), messenger: z.number().min(0).max(1), browser: z.number().min(0).max(1) }).strict(),
  localHour: z.number().min(0).max(23.99).optional(),
  appOpenHours: z.array(z.number().int().min(0).max(23)).min(1).max(8),
  contacts30d: z.number().int().min(0).max(30),
  signals: z.array(z.object({
    id: txt(20).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source: z.enum(["bank", "insurance", "app", "external"]),
    merchant: txt(80).optional(),
    amount: z.number().min(-1e7).max(1e7).optional(),
    category: cat,
    text: txt(200).min(1),
  }).strict()).min(1).max(15),
}).strict();
