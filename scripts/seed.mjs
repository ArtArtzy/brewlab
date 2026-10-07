import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const equipment = [
  ["grinder", "Timemore C3s", true],
  ["dripper", "Origami Air M", true],
  ["moka", "3 Cup", true],
  ["filter", "ORIGAMI Cone", false],
  ["filter", "CAFEC Abaca", false],
  ["filter", "ORIGAMI Wave", false],
  ["sweetener", "Condensed Milk", true],
  ["sweetener", "Sugar", false],
  ["sweetener", "Coconut Sugar", false],
];
const { data: existing, error } = await db
  .from("equipment")
  .select("kind,name");
if (error) throw error;
for (const [kind, name, is_default] of equipment) {
  if (existing.some((e) => e.kind === kind && e.name === name)) continue;
  const { error } = await db.from("equipment").insert({
    kind,
    name,
    is_default,
    setting_type: "CLICKS",
    available: true,
  });
  if (error) throw error;
}
const notes = JSON.parse(
  readFileSync(
    new URL("../src/lib/domain/taste-notes.json", import.meta.url),
    "utf8",
  ),
);
const choices = Object.entries(notes)
  .flatMap(([category, ns]) =>
    ns.map((name) => ({ kind: "note", name, category })),
  )
  .concat(
    ["Washed", "Natural", "Honey", "Anaerobic"].map((name) => ({
      kind: "process",
      name,
      category: "",
    })),
    ["Circular", "Center Pour", "Zigzag", "Slow Pour", "Fast Pour"].map(
      (name) => ({ kind: "pattern", name, category: "" }),
    ),
  );
const { data: existingChoices, error: choicesError } = await db
  .from("choices")
  .select("kind,name");
if (choicesError) throw choicesError;
const keys = new Set(
  existingChoices.map((c) => `${c.kind}:${c.name.toLowerCase()}`),
);
const missingChoices = choices.filter(
  (c) => !keys.has(`${c.kind}:${c.name.toLowerCase()}`),
);
const result = missingChoices.length
  ? await db
      .from("choices")
      .upsert(missingChoices, {
        onConflict: "kind,name",
        ignoreDuplicates: true,
      })
  : { error: null };
if (result.error) throw result.error;
console.log(
  "Equipment and reusable choices seeded. No beans or brew history created.",
);
