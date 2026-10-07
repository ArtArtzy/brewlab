"use client";
import { useState } from "react";
import { categories, Choice, Data } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function TasteNoteEditor({
  item,
  data,
  save,
  close,
}: {
  item?: Choice;
  data: Data;
  save: (action: string, value: unknown, id?: string) => Promise<void>;
  close: () => void;
}) {
  const [name, setName] = useState(item?.name || "");
  const [category, setCategory] = useState(item?.category || "Fruity");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const used = item
    ? data.beans.filter((b) => b.notes.includes(item.name)).length
    : 0;
  return (
    <Dialog title={item ? "Edit taste note" : "Add taste note"} onClose={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const trimmed = name.trim();
          if (!trimmed) {
            setError("Enter a taste note name.");
            return;
          }
          if (
            data.choices.some(
              (c) =>
                c.kind === "note" && c.id !== item?.id && c.name === trimmed,
            )
          ) {
            setError("A taste note with this name already exists.");
            return;
          }
          setBusy(true);
          try {
            await save(
              item ? "tasteNote" : "choice",
              { kind: "note", name: trimmed, category },
              item?.id,
            );
            close();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to save taste note",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Name
          <input
            required
            autoFocus
            maxLength={80}
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Category
          <select
            value={category}
            disabled={busy}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {used > 0 && (
          <p className="muted">
            Renaming updates this taste note on {used}{" "}
            {used === 1 ? "bean" : "beans"}.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={close}
          >
            Cancel
          </Button>
          <Button disabled={busy}>
            {busy ? "Saving…" : "Save taste note"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
