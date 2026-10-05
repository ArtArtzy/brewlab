"use client";
import {
  ArrowLeft,
  ArrowRight,
  Coffee,
  Plus,
  Pin as PinIcon,
} from "lucide-react";
import {
  Bean,
  Data,
  baseDose,
  familyFor,
  scaleDose,
  drinkNames,
} from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { RecipeView } from "./recipe-view";
import { initialRecipe } from "./recipe-editor";
import { Screen, Modal } from "../types";
export function RecipeScreen({
  screen,
  bean,
  data,
  back,
  setModal,
  setScreen,
  run,
  save,
}: {
  screen: Extract<Screen, { type: "recipe" }>;
  bean: Bean;
  data: Data;
  back: () => void;
  setModal: (m: Modal) => void;
  setScreen: (s: Screen) => void;
  run: (fn: () => Promise<void>) => Promise<void>;
  save: (action: string, value: unknown, id?: string) => Promise<void>;
}) {
  const isCustom =
      screen.drink === "AMERICANO" && ![15, 20].includes(screen.dose),
    base = isCustom ? baseDose(screen.dose) : screen.dose,
    family = familyFor(screen.drink, base),
    latestId = data.recipe_families.find(
      (f) => f.bean_id === bean.id && f.family === family,
    )?.latest_id,
    latest = data.recipe_versions.find((v) => v.id === latestId),
    current =
      data.recipe_versions.find((v) => v.id === screen.versionId) || latest;
  const pins = data.recipe_pins
    .filter((p) => p.bean_id === bean.id && p.family === family)
    .sort((a, b) => {
      const order = ["Love it", "Wife", "Mine"];
      return (
        (order.includes(a.label) ? order.indexOf(a.label) : 99) -
        (order.includes(b.label) ? order.indexOf(b.label) : 99)
      );
    });
  const recipe = current
    ? isCustom
      ? scaleDose(current.snapshot, screen.dose)
      : current.snapshot
    : null;
  return (
    <>
      <button className="back" onClick={back}>
        <ArrowLeft size={16} />{" "}
        {screen.drink === "AMERICANO" ? "Choose dose" : "Choose bean"}
      </button>
      <div className="page-top">
        <div>
          <div className="eyebrow">
            {drinkNames[screen.drink]} /{" "}
            {isCustom
              ? "CUSTOM DOSE"
              : `${screen.drink === "AMERICANO" ? screen.dose + "g" : "MOKA POT"} RECIPE`}
          </div>
          <h1>{bean.name}</h1>
          <p className="muted">{bean.roaster}</p>
        </div>
        {recipe && (
          <Button
            variant="outline"
            onClick={() =>
              setModal({
                type: "editor",
                beanId: bean.id,
                recipe: current!.snapshot,
              })
            }
          >
            {isCustom ? "Edit base recipe" : "Edit / copy recipe"}
          </Button>
        )}
      </div>
      {isCustom && (
        <p className="custom-notice">
          Based on your {base}g recipe · Temporary dose. Your canonical recipes
          stay intact.
        </p>
      )}
      {recipe ? (
        <>
          <div className="recipe-tabs">
            <button
              className={
                !screen.versionId || screen.versionId === latestId
                  ? "active"
                  : ""
              }
              onClick={() => setScreen({ ...screen, versionId: undefined })}
            >
              Latest
            </button>
            {pins.map((p) => (
              <button
                className={screen.versionId === p.version_id ? "active" : ""}
                key={p.id}
                onClick={() =>
                  setScreen({
                    ...screen,
                    versionId: p.version_id,
                  })
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="recipe-layout">
            <RecipeView recipe={recipe} />
            <aside className="recipe-aside">
              <div className="eyebrow">READY WHEN YOU ARE</div>
              <h3>
                Take a moment.
                <br />
                Make a good cup.
              </h3>
              <p className="muted">
                Your recipe is here for a quick glance. Come back when you’re
                ready to record the result.
              </p>
              <Button
                className="full"
                onClick={() =>
                  setModal({
                    type: "brew",
                    beanId: bean.id,
                    recipe,
                    versionId: current!.id,
                  })
                }
              >
                Log this brew <ArrowRight size={18} />
              </Button>
              {!isCustom && (
                <>
                  <Button
                    variant="outline"
                    className="full"
                    onClick={() => setModal({ type: "pin", version: current! })}
                  >
                    <PinIcon size={16} /> Pin recipe
                  </Button>
                  {current?.id !== latestId && (
                    <Button
                      variant="ghost"
                      className="full"
                      onClick={() => run(() => save("recipe", recipe, bean.id))}
                    >
                      Set as Latest
                    </Button>
                  )}
                </>
              )}
              <p className="fine-print">Logging a brew never changes Latest.</p>
            </aside>
          </div>
        </>
      ) : (
        <div className="empty">
          <Coffee size={38} strokeWidth={1.3} />
          <h2>No recipe yet</h2>
          <p>
            Create your first{" "}
            {screen.drink === "AMERICANO"
              ? base + "g"
              : drinkNames[screen.drink]}{" "}
            recipe to get started.
          </p>
          <Button
            onClick={() =>
              setModal({
                type: "editor",
                beanId: bean.id,
                recipe: initialRecipe(data, screen.drink, base),
              })
            }
          >
            <Plus size={17} /> Create Recipe
          </Button>
        </div>
      )}
    </>
  );
}
