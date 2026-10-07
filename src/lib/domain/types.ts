import { z } from "zod";
import commonTasteNotes from "./taste-notes.json";
export const drinks = ["AMERICANO", "HOT_LATTE", "ICED_LATTE"] as const;
export type Drink = (typeof drinks)[number];
export const drinkNames: Record<Drink, string> = {
  AMERICANO: "Americano",
  HOT_LATTE: "Hot Latte",
  ICED_LATTE: "Iced Latte",
};
export const roasts = [
  "Light",
  "Medium-Light",
  "Medium",
  "Medium-Dark",
  "Dark",
];
export const categories = [
  "Fruity",
  "Floral",
  "Sweet",
  "Chocolate / Nutty",
  "Other",
];
export const noteSeeds: Record<string, string[]> = commonTasteNotes;
export const beanSchema = z.object({
  name: z.string().trim().min(1).max(120),
  roaster: z.string().trim().min(1).max(120),
  origin: z.string().max(120).default(""),
  process: z.string().max(120).default(""),
  roast: z
    .enum(["", "Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"])
    .default(""),
  rating: z.enum(["", "DISLIKE", "LIKE", "LOVE"]).default(""),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  notes: z.array(z.string().max(80)).max(40).default([]),
  cover: z
    .string()
    .regex(/^$|^[\da-f-]+\.webp$/)
    .default(""),
});
export type Bean = z.infer<typeof beanSchema> & {
  id: string;
  created_at: string;
};
export const stepSchema = z.object({
  time: z.number().min(0).max(1800),
  water: z.number().positive().max(3000),
  temperature: z.number().min(20).max(100),
  patterns: z.array(z.string().min(1).max(80)).min(1),
});
export const recipeSchema = z
  .object({
    drink: z.enum(drinks),
    dose: z.number().min(1).max(100),
    water: z.number().min(0).max(3000),
    grinder: z.string().min(1),
    settingType: z.enum(["CLICKS", "NUMBER", "CUSTOM_TEXT"]),
    grind: z.string().min(1).max(80),
    dripper: z.string(),
    filter: z.string(),
    moka: z.string(),
    milk: z.number().min(0).max(1000),
    sweetener: z.string(),
    sweetenerAmount: z.number().min(0).max(200),
    finishMin: z.number().min(0).max(1800),
    finishMax: z.number().min(0).max(1800),
    wait: z.number().min(0).max(60),
    steps: z.array(stepSchema).max(20),
  })
  .superRefine((r, c) => {
    if (r.drink === "AMERICANO") {
      if (!r.water || !r.dripper || !r.filter || !r.steps.length)
        c.addIssue({
          code: "custom",
          message: "Add water, dripper, filter and at least one pour step.",
        });
      if (!r.finishMin || r.finishMin > r.finishMax)
        c.addIssue({
          code: "custom",
          message:
            "Enter a finish range with a positive minimum below the maximum.",
        });
      let prev = 0;
      for (const s of r.steps) {
        if (s.water <= prev || s.water > r.water)
          c.addIssue({
            code: "custom",
            message: "Pour targets must increase and stay within total water.",
          });
        prev = s.water;
      }
      if (r.steps.at(-1)?.water !== r.water)
        c.addIssue({
          code: "custom",
          message: "Final pour target must equal total water.",
        });
    } else if (!r.moka || !r.sweetener || !r.milk)
      c.addIssue({
        code: "custom",
        message: "Choose a moka pot, one sweetener and a positive milk amount.",
      });
    if (
      r.settingType !== "CUSTOM_TEXT" &&
      (!Number.isFinite(Number(r.grind)) || Number(r.grind) < 0)
    )
      c.addIssue({
        code: "custom",
        message: "Grind setting must be a non-negative number.",
      });
    if (r.settingType === "CLICKS" && !Number.isInteger(Number(r.grind)))
      c.addIssue({ code: "custom", message: "Clicks must be a whole number." });
  });
export type Recipe = z.infer<typeof recipeSchema>;
export type Version = {
  id: string;
  bean_id: string;
  family: string;
  snapshot: Recipe;
  created_at: string;
};
export type Pin = {
  id: string;
  bean_id: string;
  family: string;
  label: string;
  version_id: string;
};
export type Brew = {
  id: string;
  bean_id: string;
  family: string;
  snapshot: Recipe;
  source_version_id: string | null;
  rating: number | null;
  feedback: string[];
  note: string;
  adjustments: Adjustment[];
  created_at: string;
};
export type Equipment = {
  id: string;
  kind: "grinder" | "dripper" | "filter" | "moka" | "sweetener";
  name: string;
  setting_type: "CLICKS" | "NUMBER" | "CUSTOM_TEXT";
  available: boolean;
  is_default: boolean;
};
export type Choice = {
  id: string;
  kind: "note" | "process" | "pattern";
  name: string;
  category: string;
};
export type Purchase = {
  id: string;
  bean_id: string;
  date: string;
  weight: number;
  price: number;
};
export type Family = {
  id: string;
  bean_id: string;
  family: string;
  latest_id: string;
};
export type Data = {
  beans: Bean[];
  recipe_versions: Version[];
  recipe_families: Family[];
  recipe_pins: Pin[];
  brew_logs: Brew[];
  equipment: Equipment[];
  choices: Choice[];
  purchases: Purchase[];
};
export type Adjustment = {
  field:
    | "grind"
    | "temperature"
    | "water"
    | "milk"
    | "sweetenerAmount"
    | "dose"
    | "agitation";
  delta: number;
  label: string;
};
export function familyFor(drink: Drink, dose: number) {
  return drink === "AMERICANO"
    ? `AMERICANO_${dose === 15 ? 15 : dose === 20 ? 20 : "CUSTOM"}`
    : drink;
}
export const canonical = (r: Recipe) =>
  r.drink !== "AMERICANO" || r.dose === 15 || r.dose === 20;
export const adjustmentSchema = z.object({
  field: z.enum([
    "grind",
    "temperature",
    "water",
    "milk",
    "sweetenerAmount",
    "dose",
    "agitation",
  ]),
  delta: z.number().min(-500).max(500),
  label: z.string().max(120),
});
export const baseDose = (dose: number): 15 | 20 => (dose < 17.5 ? 15 : 20);
export const ratio = (dose: number, water: number) =>
  Math.round((water / dose) * 100) / 100;
export const pricePer100 = (price: number, weight: number) =>
  weight > 0 ? (price / weight) * 100 : 0;
export const timeLabel = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export function scaleDose(r: Recipe, dose: number): Recipe {
  const factor = dose / r.dose;
  return {
    ...structuredClone(r),
    dose,
    water: Math.round(r.water * factor),
    steps: r.steps.map((s) => ({
      ...s,
      water: Math.round(s.water * factor),
      patterns: [...s.patterns],
    })),
  };
}
