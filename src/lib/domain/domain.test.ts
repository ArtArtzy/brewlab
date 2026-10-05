import { describe, it, expect } from "vitest";
import {
  baseDose,
  scaleDose,
  ratio,
  pricePer100,
  recipeSchema,
  canonical,
  familyFor,
} from "./types";
import { suggest, applyAdjustments } from "../recommendations";
import { recipe } from "../../../tests/recipe-fixture";

describe("Dose and arithmetic", () => {
  it.each([
    [16.3, 15],
    [18, 20],
    [17.5, 20],
  ])("bases %s on %s", (dose, base) => expect(baseDose(dose)).toBe(base));
  it("scales cumulative water but preserves timing and grind", () => {
    const r = scaleDose(recipe, 16.3);
    expect(r.water).toBe(261);
    expect(r.steps.map((s) => s.water)).toEqual([54, 130, 196, 261]);
    expect(r.grind).toBe("16");
    expect(r.steps[1].time).toBe(40);
    expect(recipe.water).toBe(240);
    expect(canonical(r)).toBe(false);
    expect(familyFor(r.drink, r.dose)).toBe("AMERICANO_CUSTOM");
  });
  it("calculates ratio and THB price per 100g", () => {
    expect(ratio(15, 240)).toBe(16);
    expect(pricePer100(450, 200)).toBe(225);
  });
});
describe("Recommendations", () => {
  it("uses small decimal increments for NUMBER grinders", () => {
    const r = { ...recipe, settingType: "NUMBER" as const, grind: "6.5" };
    const a = suggest(r, ["Too sour"]).find((a) => a.field === "grind");
    expect(a?.delta).toBe(-0.1);
    expect(applyAdjustments(r, [a!]).grind).toBe("6.4");
  });
  it("suggests finer and hotter for sour pour over", () => {
    const a = suggest(recipe, ["Too sour"]);
    expect(a).toContainEqual({
      field: "grind",
      delta: -1,
      label: "Grind finer 1 click",
    });
    expect(a.some((x) => x.field === "temperature" && x.delta === 1)).toBe(
      true,
    );
  });
  it("suggests coarser for slow flow and less agitation for astringency", () => {
    expect(
      suggest(recipe, ["Flow too slow", "Astringent"]).some(
        (a) => a.field === "grind" && a.delta === 1,
      ),
    ).toBe(true);
    expect(
      suggest(recipe, ["Astringent"]).some((a) => a.field === "agitation"),
    ).toBe(true);
  });
  it("deduplicates repeated recommendations", () => {
    const a = suggest(recipe, ["Too sour", "Too weak"]);
    expect(a.filter((x) => x.field === "grind" && x.delta === -1)).toHaveLength(
      1,
    );
  });
  it("does not do arithmetic on custom-text grinders", () => {
    const r = {
      ...recipe,
      settingType: "CUSTOM_TEXT" as const,
      grind: "2.3.0",
    };
    expect(suggest(r, ["Too sour"]).some((a) => a.field === "grind")).toBe(
      false,
    );
    expect(
      applyAdjustments(r, [{ field: "grind", delta: -1, label: "test" }]).grind,
    ).toBe("2.3.0");
  });
  it("handles latte feedback and multiple adjustments without mutation", () => {
    const r = {
      ...recipe,
      drink: "HOT_LATTE" as const,
      milk: 140,
      sweetener: "Condensed Milk",
      sweetenerAmount: 15,
      moka: "3 Cup",
    };
    const options = suggest(r, ["Too sweet", "Coffee too weak"]);
    const selected = options.filter(
      (a) =>
        (a.field === "milk" && a.delta === -10) ||
        (a.field === "sweetenerAmount" && a.delta === -2),
    );
    const next = applyAdjustments(r, selected);
    expect(next.milk).toBe(130);
    expect(next.sweetenerAmount).toBe(13);
    expect(r.milk).toBe(140);
    expect(r.sweetenerAmount).toBe(15);
  });
  it("scales water targets when applying water changes", () => {
    const r = applyAdjustments(recipe, [
      { field: "water", delta: -20, label: "Less water" },
    ]);
    expect(r.water).toBe(220);
    expect(r.steps.at(-1)?.water).toBe(220);
    expect(recipe.steps.at(-1)?.water).toBe(240);
  });
});
describe("Validation", () => {
  it("rejects negative doses and invalid cumulative pours", () => {
    expect(recipeSchema.safeParse({ ...recipe, dose: -1 }).success).toBe(false);
    expect(
      recipeSchema.safeParse({
        ...recipe,
        steps: [{ ...recipe.steps[0], water: 250 }],
      }).success,
    ).toBe(false);
  });
  it("requires a final pour matching total water", () => {
    expect(recipeSchema.safeParse({ ...recipe, water: 250 }).success).toBe(
      false,
    );
  });
});
