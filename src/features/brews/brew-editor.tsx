"use client";
import { useState } from "react";
import {
  Adjustment,
  Brew,
  Data,
  Recipe,
  canonical,
  familyFor,
  recipeSchema,
} from "@/lib/domain/types";
import {
  applyAdjustments,
  latteFeedback,
  pourFeedback,
  suggest,
} from "@/lib/recommendations";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RecipeView } from "@/features/recipes/recipe-view";
import { RecipeEditor } from "@/features/recipes/recipe-editor";
export function BrewEditor({
  recipe,
  beanId,
  versionId,
  brew,
  data,
  save,
  close,
}: {
  recipe: Recipe;
  beanId: string;
  versionId: string | null;
  brew?: Brew;
  data: Data;
  save: (action: string, value: unknown, id?: string) => Promise<void>;
  close: () => void;
}) {
  const [actual, setActual] = useState(structuredClone(recipe)),
    [editing, setEditing] = useState(false),
    [rating, setRating] = useState<number | null>(brew?.rating || null),
    [feedback, setFeedback] = useState<string[]>(brew?.feedback || []),
    [note, setNote] = useState(brew?.note || ""),
    [adjustments, setAdjustments] = useState<Adjustment[]>([]),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [field, setField] = useState<Adjustment["field"]>("water"),
    [delta, setDelta] = useState(0);
  const [loggedId] = useState(() => brew?.id || crypto.randomUUID());
  const options = suggest(actual, feedback),
    preview = applyAdjustments(actual, adjustments);
  return (
    <Dialog
      title={
        saved
          ? "A little better next time"
          : brew
            ? "Edit this brew"
            : "How was your cup?"
      }
      description={
        saved
          ? "Your brew is saved. Latest has not changed."
          : "Record what you actually brewed. Rating and feedback are optional."
      }
      onClose={() => {
        if (saved || confirm("Discard this unsaved brew?")) close();
      }}
    >
      {!saved && (
        <>
          <div className="section-heading">
            <h3>Actual brew</h3>
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? "Hide editor" : "Edit actual values"}
            </Button>
          </div>
          {editing ? (
            <RecipeEditor
              initial={actual}
              data={data}
              onSave={async (r) => {
                setActual(r);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
              saveLabel="Use these actual values"
            />
          ) : (
            <RecipeView recipe={actual} compact />
          )}
          <p className="field-title">
            Overall <span className="muted">Optional</span>
          </p>
          <div className="chips rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                className={`chip ${rating === n ? "selected" : ""}`}
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`Rate ${n} out of 5`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="field-title">
            What felt off? <span className="muted">Optional</span>
          </p>
          <div className="chips">
            {(actual.drink === "AMERICANO" ? pourFeedback : latteFeedback).map(
              (f) => (
                <button
                  key={f}
                  className={`chip ${feedback.includes(f) ? "selected" : ""}`}
                  onClick={() =>
                    setFeedback(
                      feedback.includes(f)
                        ? feedback.filter((x) => x !== f)
                        : [...feedback, f],
                    )
                  }
                >
                  {f}
                </button>
              ),
            )}
          </div>
          <details>
            <summary>Add note</summary>
            <textarea
              aria-label="Brew note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </details>
          <div className="form-footer">
            <Button
              disabled={busy || editing}
              onClick={async () => {
                setBusy(true);
                try {
                  await save(
                    "brew",
                    {
                      created_id: loggedId,
                      bean_id: beanId,
                      source_version_id: versionId,
                      family: familyFor(actual.drink, actual.dose),
                      snapshot: actual,
                      rating,
                      feedback,
                      note,
                      adjustments: [],
                    },
                    brew?.id,
                  );
                  setSaved(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to save");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "Save brew"}
            </Button>
          </div>
        </>
      )}
      {saved && (
        <>
          {!canonical(actual) ? (
            <div className="empty small-empty">
              <h3>Custom cup, safely recorded.</h3>
              <p>Feedback on this dose won’t change your 15g or 20g recipes.</p>
            </div>
          ) : (
            <>
              {feedback.length > 0 && (
                <>
                  <h3>Try adjusting next time</h3>
                  <p className="muted">
                    Changing one variable at a time makes it easier to
                    understand what improved the cup.
                  </p>
                  <div className="chips adjustment-chips">
                    {options.map((a) => (
                      <button
                        key={a.label}
                        className={`chip ${adjustments.some((x) => x.label === a.label) ? "selected" : ""}`}
                        onClick={() =>
                          setAdjustments((p) =>
                            p.some((x) => x.label === a.label)
                              ? p.filter((x) => x.label !== a.label)
                              : [...p.filter((x) => x.field !== a.field), a],
                          )
                        }
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <details>
                    <summary>Custom adjustment</summary>
                    <div className="form-grid">
                      <label>
                        Variable
                        <select
                          value={field}
                          onChange={(e) =>
                            setField(e.target.value as Adjustment["field"])
                          }
                        >
                          {(actual.drink === "AMERICANO"
                            ? ["grind", "temperature", "water"]
                            : ["grind", "dose", "milk", "sweetenerAmount"]
                          )
                            .filter(
                              (f) =>
                                f !== "grind" ||
                                actual.settingType !== "CUSTOM_TEXT",
                            )
                            .map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Change (+ or −)
                        <input
                          type="number"
                          step="any"
                          value={delta}
                          onChange={(e) => setDelta(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setAdjustments((p) => [
                          ...p.filter((x) => x.field !== field),
                          { field, delta, label: `Custom ${field} ${delta}` },
                        ])
                      }
                    >
                      Select adjustment
                    </Button>
                  </details>
                </>
              )}
              <div className="section-heading">
                <h3>Next recipe preview</h3>
                <span className="eyebrow">Not applied yet</span>
              </div>
              <RecipeView recipe={preview} compact />
              <div className="form-footer">
                <Button variant="outline" onClick={close}>
                  Done
                </Button>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await save("nextRecipe", {
                        recipe: recipeSchema.parse(preview),
                        brewId: loggedId,
                        adjustments,
                      });
                      close();
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Unable to update Latest",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Use as next recipe
                </Button>
              </div>
            </>
          )}
          {!canonical(actual) && <Button onClick={close}>Done</Button>}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}
