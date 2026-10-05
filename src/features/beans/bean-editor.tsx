"use client";
import { useState } from "react";
import {
  Bean,
  Data,
  beanSchema,
  categories,
  noteSeeds,
  roasts,
} from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
type Save = (action: string, value: unknown, id?: string) => Promise<void>;
export function BeanEditor({
  bean,
  data,
  save,
  close,
}: {
  bean?: Bean;
  data: Data;
  save: Save;
  close: () => void;
}) {
  const [v, set] = useState(
    bean
      ? { ...bean }
      : {
          name: "",
          roaster: "",
          origin: "",
          process: "",
          roast: "",
          rating: "",
          status: "ACTIVE",
          notes: [] as string[],
          cover: "",
        },
  );
  const [category, setCategory] = useState("Fruity"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [custom, setCustom] = useState(""),
    [customProcess, setCustomProcess] = useState("");
  const update = (key: string, value: unknown) =>
    set((p) => ({ ...p, [key]: value }));
  const closeSafe = () => {
    if (
      JSON.stringify(v) !==
        JSON.stringify(
          bean || {
            name: "",
            roaster: "",
            origin: "",
            process: "",
            roast: "",
            rating: "",
            status: "ACTIVE",
            notes: [],
            cover: "",
          },
        ) &&
      !confirm("Discard your unsaved bean changes?")
    )
      return;
    close();
  };
  const notes = [
    ...new Set([
      ...(noteSeeds[category] || []),
      ...data.choices
        .filter((n) => n.kind === "note" && n.category === category)
        .map((n) => n.name),
    ]),
  ];
  const frequent = [...new Set(data.beans.flatMap((b) => b.notes))]
    .sort(
      (a, b) =>
        data.beans.filter((x) => x.notes.includes(b)).length -
        data.beans.filter((x) => x.notes.includes(a)).length,
    )
    .slice(0, 6);
  const toggle = (note: string) =>
    update(
      "notes",
      v.notes.includes(note)
        ? v.notes.filter((n) => n !== note)
        : [...v.notes, note],
    );
  return (
    <Dialog
      title={bean ? "Edit bean" : "A new coffee"}
      description="Start with what’s on the bag. Everything else can wait."
      onClose={closeSafe}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const value = beanSchema.parse(v);
            await save("bean", value, bean?.id);
            close();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Bean name
            <input
              required
              autoFocus
              value={v.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Honduras Whiskey"
            />
          </label>
          <label>
            Brand / Roaster
            <input
              required
              value={v.roaster}
              onChange={(e) => update("roaster", e.target.value)}
              placeholder="Fika & Co."
            />
          </label>
        </div>
        <label className="upload">
          {v.cover ? "Change cover image" : "Add a bag photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                const form = new FormData();
                form.set("file", file);
                const res = await fetch("/api/cover", {
                  method: "POST",
                  body: form,
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);
                update("cover", result.path);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Upload failed");
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        <details>
          <summary>
            Origin, roast & tasting notes <span>Optional</span>
          </summary>
          <label>
            Country / Origin
            <input
              value={v.origin}
              onChange={(e) => update("origin", e.target.value)}
            />
          </label>
          <label>
            Roast
            <select
              value={v.roast}
              onChange={(e) => update("roast", e.target.value)}
            >
              <option value="">Not specified</option>
              {roasts.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <p className="field-title">Process</p>
          <div className="chips">
            {[
              ...new Set([
                "Washed",
                "Natural",
                "Honey",
                "Anaerobic",
                ...data.choices
                  .filter((c) => c.kind === "process")
                  .map((c) => c.name),
              ]),
            ].map((p) => (
              <button
                type="button"
                key={p}
                className={`chip ${v.process === p ? "selected" : ""}`}
                onClick={() => update("process", v.process === p ? "" : p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input
              aria-label="Custom process"
              placeholder="Custom process"
              value={customProcess}
              onChange={(e) => setCustomProcess(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!customProcess.trim()) return;
                await save("choice", {
                  kind: "process",
                  name: customProcess,
                  category: "",
                });
                update("process", customProcess.trim());
                setCustomProcess("");
              }}
            >
              Add
            </Button>
          </div>
          <p className="field-title">Taste notes</p>
          {frequent.length > 0 && (
            <>
              <p className="muted">Frequently used</p>
              <div className="chips">
                {frequent.map((n) => (
                  <button
                    type="button"
                    className={`chip ${v.notes.includes(n) ? "selected" : ""}`}
                    key={n}
                    onClick={() => toggle(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="chips categories">
            {categories.map((c) => (
              <button
                type="button"
                className={`chip ${category === c ? "selected" : ""}`}
                key={c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="chips">
            {notes.map((n) => (
              <button
                type="button"
                key={n}
                className={`chip ${v.notes.includes(n) ? "selected" : ""}`}
                onClick={() => toggle(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="inline-form">
            <input
              aria-label="Custom taste note"
              placeholder="Custom note"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!custom.trim()) return;
                await save("choice", { kind: "note", name: custom, category });
                toggle(custom.trim());
                setCustom("");
              }}
            >
              Add
            </Button>
          </div>
          {v.notes.length > 0 && (
            <p className="muted">Selected: {v.notes.join(" · ")}</p>
          )}
        </details>
        <p className="field-title">
          How do you feel about this bean?{" "}
          <span className="muted">Optional</span>
        </p>
        <div className="chips">
          {[
            ["", "No rating"],
            ["DISLIKE", "Dislike"],
            ["LIKE", "Like"],
            ["LOVE", "Love"],
          ].map(([key, name]) => (
            <button
              type="button"
              key={key}
              className={`chip ${v.rating === key ? "selected" : ""}`}
              onClick={() => update("rating", key)}
            >
              {name}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Button variant="outline" type="button" onClick={closeSafe}>
            Cancel
          </Button>
          <Button disabled={busy}>
            {busy ? "Saving…" : bean ? "Save changes" : "Add bean"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
