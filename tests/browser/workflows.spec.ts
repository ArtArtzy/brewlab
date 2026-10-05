import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test("Home, bean creation, canonical recipe, logging and explicit adjustment", async ({
  page,
}, testInfo) => {
  const beanId = "4eecf235-1a60-43af-a82b-a49a18021a93",
    versionId = "c8a5d7ac-2daf-4c5b-924a-85b96b8976db";
  const data = {
    beans: [] as Record<string, unknown>[],
    recipe_versions: [] as Record<string, unknown>[],
    recipe_families: [] as Record<string, unknown>[],
    recipe_pins: [] as Record<string, unknown>[],
    brew_logs: [] as Record<string, unknown>[],
    equipment: [
      {
        id: "g",
        kind: "grinder",
        name: "Timemore C3s",
        setting_type: "CLICKS",
        is_default: true,
        available: true,
      },
      {
        id: "d",
        kind: "dripper",
        name: "Origami Air M",
        is_default: true,
        available: true,
      },
      {
        id: "f",
        kind: "filter",
        name: "CAFEC Abaca",
        is_default: false,
        available: true,
      },
      {
        id: "m",
        kind: "moka",
        name: "3 Cup",
        is_default: true,
        available: true,
      },
      {
        id: "s",
        kind: "sweetener",
        name: "Condensed Milk",
        is_default: true,
        available: true,
      },
    ],
    choices: [],
    purchases: [],
  };
  const actions: string[] = [];
  await page.route("**/api/unlock", (r) => r.fulfill({ json: { ok: true } }));
  await page.route("**/api/data", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: data });
    const b = route.request().postDataJSON();
    actions.push(b.action);
    if (b.action === "bean")
      data.beans.push({
        ...b.value,
        id: beanId,
        created_at: new Date().toISOString(),
      });
    if (b.action === "recipe" || b.action === "nextRecipe") {
      const newId = data.recipe_versions.length ? randomUUID() : versionId;
      data.recipe_versions.push({
        id: newId,
        bean_id: beanId,
        family: "AMERICANO_15",
        snapshot: b.action === "nextRecipe" ? b.value.recipe : b.value,
        created_at: new Date().toISOString(),
      });
      data.recipe_families = [
        {
          id: "family",
          bean_id: beanId,
          family: "AMERICANO_15",
          latest_id: newId,
        },
      ];
    }
    if (b.action === "pin")
      data.recipe_pins.push({
        id: randomUUID(),
        bean_id: beanId,
        family: "AMERICANO_15",
        version_id: b.versionId,
        label: b.label,
      });
    if (b.action === "brew")
      data.brew_logs.push({
        ...b.value,
        id: b.value.created_id,
        created_at: new Date().toISOString(),
      });
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto("/");
  await page.getByLabel("Your 4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Unlock Brew Lab" }).click();
  await expect(
    page.getByRole("heading", { name: "What would you like today?" }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /01 Americano/ }).click();
  await page
    .getByRole("button", { name: "Add bean", exact: true })
    .first()
    .click();
  await page.getByLabel("Bean name").fill("Honduras Whiskey");
  await page.getByLabel("Brand / Roaster").fill("Fika & Co.");
  await page
    .getByRole("button", { name: "Add bean", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: /Fika & Co.*Honduras Whiskey/i })
    .click();
  await page.getByRole("button", { name: "YOUR RECIPE 15g" }).click();
  await page.getByRole("button", { name: "Create Recipe" }).click();
  await page.getByLabel("Total water · g").fill("240");
  await page.getByLabel("Grind setting").fill("16");
  await page.getByLabel("Paper filter").selectOption("CAFEC Abaca");
  await page.getByLabel("Target finish · from").fill("2:20");
  await page.getByLabel("Target finish · to").fill("2:40");
  await page.getByLabel("Wait before drinking · min").fill("5");
  await page.getByRole("button", { name: "Add step" }).click();
  await page.getByLabel("Pour to · g").fill("240");
  await page.getByRole("button", { name: "Save as Latest" }).click();
  await expect(page.getByText("Pour to 240g", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `artifacts/recipe-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Pin recipe", exact: true }).click();
  await page.getByRole("button", { name: "Mine", exact: true }).last().click();
  await page
    .getByRole("button", { name: "Pin recipe", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Log this brew" }).click();
  await page.getByRole("button", { name: "Too sour", exact: true }).click();
  await page.getByRole("button", { name: "Save brew", exact: true }).click();
  expect(actions.filter((a) => a === "recipe")).toHaveLength(1);
  await page
    .getByRole("button", { name: "Grind finer 1 click", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Temperature + 1°C", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use as next recipe", exact: true })
    .click();
  expect(actions.filter((a) => a === "nextRecipe")).toHaveLength(1);
  expect(data.brew_logs).toHaveLength(1);
  expect(data.brew_logs[0].snapshot).toMatchObject({ grind: "16" });
  expect(data.recipe_versions.at(-1)?.snapshot).toMatchObject({ grind: "15" });
  expect(data.recipe_pins[0].version_id).toBe(versionId);
  await page.getByRole("button", { name: "Choose dose", exact: true }).click();
  await page.getByText("Custom dose", { exact: true }).click();
  await page.getByLabel("Coffee · g", { exact: true }).fill("16.3");
  await page.getByRole("button", { name: "See recipe" }).click();
  await expect(page.getByText(/Based on your 15g recipe/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pin recipe", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Log this brew" }).click();
  await page.getByRole("button", { name: "Too sour", exact: true }).click();
  await page.getByRole("button", { name: "Save brew", exact: true }).click();
  await expect(page.getByText("Custom cup, safely recorded.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use as next recipe" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  expect(data.recipe_versions).toHaveLength(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
