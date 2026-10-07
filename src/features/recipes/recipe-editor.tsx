"use client";
import { useState } from "react";
import {
  Data,
  Drink,
  Recipe,
  recipeSchema,
  timeLabel,
} from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
export function initialRecipe(data: Data, drink: Drink, dose: number): Recipe {
  const pick = (kind: string) => {
    const items = data.equipment.filter(
      (e) => e.kind === kind && (kind !== "filter" || e.available),
    );
    return items.find((e) => e.is_default) || items[0];
  };
  return {
    drink,
    dose,
    water: 0,
    grinder: pick("grinder")?.name || "",
    settingType: pick("grinder")?.setting_type || "CLICKS",
    grind: "",
    dripper: pick("dripper")?.name || "",
    filter: "",
    moka: pick("moka")?.name || "",
    milk: 0,
    sweetener: pick("sweetener")?.name || "",
    sweetenerAmount: 0,
    finishMin: 0,
    finishMax: 0,
    wait: 0,
    steps: [],
  };
}
export function RecipeEditor({
  initial,
  data,
  onSave,
  onCancel,
  saveLabel = "Save as Latest",
}: {
  initial: Recipe;
  data: Data;
  onSave: (r: Recipe) => Promise<void>;
  onCancel: () => void;
  saveLabel?: string;
}) {
  const { ask: confirm, dialog: confirmDialog } = useConfirm();
  const [r, set] = useState(structuredClone(initial)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pattern, setPattern] = useState("");
  const update = (key: keyof Recipe, value: unknown) =>
    set((p) => ({ ...p, [key]: value }));
  const numeric = (key: keyof Recipe, label: string, min = 0) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        step="any"
        value={r[key] as number}
        onChange={(e) =>
          update(key, e.target.value === "" ? 0 : Number(e.target.value))
        }
      />
    </label>
  );
  const selector = (kind: string, key: keyof Recipe, label: string) => {
    const options = data.equipment.filter(
      (e) =>
        e.kind === kind &&
        (kind !== "filter" || e.available || e.name === r[key]),
    );
    if (options.length === 1 && kind !== "filter" && options[0].name === r[key])
      return (
        <div className="equipment-static">
          <span>{label}</span>
          <strong>{options[0].name}</strong>
        </div>
      );
    return (
      <label>
        {label}
        <select
          required
          value={r[key] as string}
          onChange={(e) => {
            update(key, e.target.value);
            if (kind === "grinder")
              update(
                "settingType",
                options.find((x) => x.name === e.target.value)?.setting_type ||
                  "CLICKS",
              );
          }}
        >
          <option value="">Choose {label.toLowerCase()}</option>
          {options.map((x) => (
            <option key={x.id}>{x.name}</option>
          ))}
        </select>
      </label>
    );
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(recipeSchema.parse(r));
        } catch (e) {
          setError(e instanceof Error ? e.message : "Unable to save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {r.drink !== "AMERICANO" ? (
          numeric("dose", "Coffee · g", 1)
        ) : (
          <div className="equipment-static">
            <span>Coffee</span>
            <strong>{r.dose}g</strong>
          </div>
        )}
        {r.drink === "AMERICANO"
          ? numeric("water", "Total water · g", 1)
          : numeric("milk", "Milk · g")}
        {selector("grinder", "grinder", "Grinder")}
        <label>
          Grind setting {r.settingType === "CLICKS" ? "· clicks" : ""}
          <input
            required
            type={r.settingType === "CUSTOM_TEXT" ? "text" : "number"}
            min="0"
            step={r.settingType === "CLICKS" ? "1" : "any"}
            value={r.grind}
            placeholder={
              r.settingType === "CUSTOM_TEXT" ? "2.3.0" : "Enter your setting"
            }
            onChange={(e) => update("grind", e.target.value)}
          />
        </label>
        {r.drink === "AMERICANO" ? (
          <>
            {selector("dripper", "dripper", "Dripper")}
            {selector("filter", "filter", "Paper filter")}
            <TimeInput
              label="Target finish · from"
              value={r.finishMin}
              onChange={(n) => update("finishMin", n)}
            />
            <TimeInput
              label="Target finish · to"
              value={r.finishMax}
              onChange={(n) => update("finishMax", n)}
            />
            {numeric("wait", "Wait before drinking · min")}
          </>
        ) : (
          <>
            {selector("moka", "moka", "Moka pot")}
            {selector("sweetener", "sweetener", "Sweetener")}
            {numeric("sweetenerAmount", "Sweetener · g")}
          </>
        )}
      </div>
      {r.drink === "AMERICANO" && (
        <>
          <div className="section-heading">
            <h3>Pour steps</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                update("steps", [
                  ...r.steps,
                  {
                    time: 0,
                    water: 0,
                    temperature: 93,
                    patterns: ["Circular"],
                  },
                ])
              }
            >
              <Plus size={16} /> Add step
            </Button>
          </div>
          <p className="muted">
            Water targets are cumulative readings on your scale.
          </p>
          {r.steps.map((step, i) => (
            <div className="step-edit" key={i}>
              <div className="step-edit-head">
                <strong>Pour {i + 1}</strong>
                <div className="row">
                  <button
                    type="button"
                    aria-label="Move step up"
                    className="icon-button"
                    disabled={i === 0}
                    onClick={() => {
                      const s = [...r.steps];
                      [s[i - 1], s[i]] = [s[i], s[i - 1]];
                      update("steps", s);
                    }}
                  >
                    <ArrowUp size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move step down"
                    className="icon-button"
                    disabled={i === r.steps.length - 1}
                    onClick={() => {
                      const s = [...r.steps];
                      [s[i + 1], s[i]] = [s[i], s[i + 1]];
                      update("steps", s);
                    }}
                  >
                    <ArrowDown size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove step"
                    className="icon-button"
                    onClick={() =>
                      update(
                        "steps",
                        r.steps.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <div className="form-grid three">
                <TimeInput
                  label="Start · m:ss"
                  value={step.time}
                  onChange={(n) =>
                    update(
                      "steps",
                      r.steps.map((s, j) => (j === i ? { ...s, time: n } : s)),
                    )
                  }
                />
                {(["water", "temperature"] as const).map((key) => (
                  <label key={key}>
                    {key === "water" ? "Pour to · g" : "Water · °C"}
                    <input
                      type="number"
                      min={key === "water" ? 1 : 20}
                      max={key === "water" ? 3000 : 100}
                      value={step[key]}
                      onChange={(e) =>
                        update(
                          "steps",
                          r.steps.map((s, j) =>
                            j === i
                              ? { ...s, [key]: Number(e.target.value) }
                              : s,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="chips">
                {[
                  ...new Set([
                    "Circular",
                    "Center Pour",
                    "Zigzag",
                    "Slow Pour",
                    "Fast Pour",
                    ...data.choices
                      .filter((c) => c.kind === "pattern")
                      .map((c) => c.name),
                    ...step.patterns,
                  ]),
                ].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`chip ${step.patterns.includes(p) ? "selected" : ""}`}
                    onClick={() =>
                      update(
                        "steps",
                        r.steps.map((s, j) =>
                          j === i
                            ? {
                                ...s,
                                patterns: s.patterns.includes(p)
                                  ? s.patterns.filter((x) => x !== p)
                                  : [...s.patterns, p],
                              }
                            : s,
                        ),
                      )
                    }
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="inline-form">
            <input
              placeholder="Custom pour pattern"
              aria-label="Custom pour pattern"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <Button
              variant="outline"
              type="button"
              onClick={async () => {
                if (!pattern.trim()) return;
                const res = await fetch("/api/data", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "choice",
                    value: {
                      kind: "pattern",
                      name: pattern.trim(),
                      category: "",
                    },
                  }),
                });
                if (!res.ok) {
                  setError("Unable to add pattern");
                  return;
                }
                if (r.steps.length)
                  update(
                    "steps",
                    r.steps.map((s, i) =>
                      i === r.steps.length - 1
                        ? { ...s, patterns: [...s.patterns, pattern.trim()] }
                        : s,
                    ),
                  );
                setPattern("");
              }}
            >
              Add
            </Button>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            if (
              JSON.stringify(r) !== JSON.stringify(initial) &&
              !(await confirm({
                title: "Discard recipe changes?",
                description: "Your unsaved recipe edits will be lost.",
                confirmLabel: "Discard changes",
                destructive: true,
              }))
            )
              return;
            onCancel();
          }}
        >
          Cancel
        </Button>
        <Button disabled={busy}>{busy ? "Saving…" : saveLabel}</Button>
      </div>
      {confirmDialog}
    </form>
  );
}
function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(timeLabel(value));
  return (
    <label>
      {label}
      <input
        pattern="[0-9]+:[0-5][0-9]"
        required
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          if (/^\d+:[0-5]\d$/.test(e.target.value)) {
            const [m, s] = e.target.value.split(":").map(Number);
            onChange(m * 60 + s);
          }
        }}
      />
    </label>
  );
}
