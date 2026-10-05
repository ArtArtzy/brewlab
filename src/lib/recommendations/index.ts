import { Adjustment, Recipe } from "../domain/types";
export const pourFeedback = [
  "Too sour",
  "Too bitter",
  "Too thin",
  "Astringent",
  "Too weak",
  "Too strong",
  "Flow too fast",
  "Flow too slow",
];
export const latteFeedback = [
  "Too sweet",
  "Not sweet enough",
  "Too milky",
  "Not milky enough",
  "Coffee too weak",
  "Coffee too strong",
  "Too bitter",
];
export function suggest(r: Recipe, feedback: string[]): Adjustment[] {
  const out: Adjustment[] = [];
  const add = (
    field: Adjustment["field"],
    deltas: number[],
    name: string,
    unit: string,
  ) =>
    deltas.forEach((delta) =>
      out.push({
        field,
        delta:
          field === "grind" && r.settingType === "NUMBER" ? delta / 10 : delta,
        label: `${name} ${Math.abs(field === "grind" && r.settingType === "NUMBER" ? delta / 10 : delta)}${unit === " clicks" && Math.abs(delta) === 1 ? " click" : unit}`,
      }),
    );
  for (const f of feedback) {
    if (r.drink === "AMERICANO") {
      if (
        ["Too sour", "Too weak", "Too thin", "Flow too fast"].includes(f) &&
        r.settingType !== "CUSTOM_TEXT"
      )
        add(
          "grind",
          [-1, -2],
          "Grind finer",
          r.settingType === "CLICKS" ? " clicks" : "",
        );
      if (
        ["Too bitter", "Astringent", "Too strong", "Flow too slow"].includes(
          f,
        ) &&
        r.settingType !== "CUSTOM_TEXT"
      )
        add(
          "grind",
          [1, 2],
          "Grind coarser",
          r.settingType === "CLICKS" ? " clicks" : "",
        );
      if (f === "Too sour") add("temperature", [1, 2], "Temperature +", "°C");
      if (f === "Too bitter")
        add("temperature", [-1, -2], "Temperature −", "°C");
      if (["Too thin", "Too weak"].includes(f))
        add("water", [-10, -20], "Reduce water", "g");
      if (f === "Too strong") add("water", [10, 20], "Increase water", "g");
      if (f === "Astringent") add("agitation", [-1], "Reduce agitation", "");
    } else {
      if (f === "Too sweet")
        add("sweetenerAmount", [-2, -5], "Reduce sweetener", "g");
      if (f === "Not sweet enough")
        add("sweetenerAmount", [2, 5], "Increase sweetener", "g");
      if (["Too milky", "Coffee too weak"].includes(f))
        add("milk", [-10, -20], "Reduce milk", "g");
      if (["Not milky enough", "Coffee too strong"].includes(f))
        add("milk", [10, 20], "Increase milk", "g");
      if (f === "Coffee too weak") {
        add("dose", [1, 2], "Increase coffee", "g");
        if (r.settingType !== "CUSTOM_TEXT")
          add(
            "grind",
            [-1, -2],
            "Grind finer",
            r.settingType === "CLICKS" ? " clicks" : "",
          );
      }
      if (["Coffee too strong", "Too bitter"].includes(f))
        add("dose", [-1, -2], "Reduce coffee", "g");
      if (f === "Too bitter" && r.settingType !== "CUSTOM_TEXT")
        add(
          "grind",
          [1, 2],
          "Grind coarser",
          r.settingType === "CLICKS" ? " clicks" : "",
        );
    }
  }
  return out.filter(
    (a, i) =>
      out.findIndex((b) => b.field === a.field && b.delta === a.delta) === i,
  );
}
export function applyAdjustments(
  input: Recipe,
  adjustments: Adjustment[],
): Recipe {
  const r = structuredClone(input);
  for (const a of adjustments) {
    if (a.field === "temperature")
      r.steps = r.steps.map((s) => ({
        ...s,
        temperature: Math.max(20, Math.min(100, s.temperature + a.delta)),
      }));
    else if (a.field === "agitation")
      r.steps = r.steps.map((s) => ({
        ...s,
        patterns: ["Center Pour", "Slow Pour"],
      }));
    else if (a.field === "grind") {
      if (r.settingType !== "CUSTOM_TEXT")
        r.grind = String(
          Math.round(Math.max(0, Number(r.grind) + a.delta) * 1000) / 1000,
        );
    } else if (a.field === "water") {
      const old = r.water;
      r.water = Math.max(r.dose, r.water + a.delta);
      r.steps = r.steps.map((s) => ({
        ...s,
        water: Math.round((s.water * r.water) / old),
      }));
    } else {
      r[a.field] = Math.max(a.field === "dose" ? 1 : 0, r[a.field] + a.delta);
    }
  }
  return r;
}
