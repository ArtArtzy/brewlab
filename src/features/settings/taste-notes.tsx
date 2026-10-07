"use client";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { categories, Choice, Data } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/use-confirm";

export function TasteNotes({
  data,
  edit,
  remove,
  restore,
}: {
  data: Data;
  edit: (item?: Choice) => void;
  remove: (item: Choice) => Promise<void>;
  restore: () => Promise<void>;
}) {
  const { ask: confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const notes = data.choices
    .filter(
      (c) =>
        c.kind === "note" &&
        c.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="settings-section taste-note-settings">
      <div className="section-heading">
        <h2>Taste notes</h2>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => edit()}
        >
          <Plus size={17} /> Add taste note
        </Button>
      </div>
      <p className="muted">Manage the tags you use to describe your coffee.</p>
      <Button
        variant="ghost"
        disabled={busy !== null}
        onClick={async () => {
          setBusy("restore");
          setError("");
          try {
            await restore();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to add suggested notes",
            );
          } finally {
            setBusy(null);
          }
        }}
      >
        {busy === "restore"
          ? "Adding suggestions…"
          : "Add missing suggested notes"}
      </Button>
      <input
        aria-label="Search taste notes"
        placeholder="Search taste notes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="settings-grid">
        {categories.map((category) => {
          const matches = notes.filter((n) => n.category === category);
          if (!matches.length && search.trim()) return null;
          return (
            <details
              className="taste-note-category"
              key={category}
              open={search.trim() ? true : undefined}
            >
              <summary>
                {category} <span>{matches.length} notes</span>
              </summary>
              {!matches.length && <p className="muted">No taste notes yet.</p>}
              {matches.map((note) => {
                const used = data.beans.filter((b) =>
                  b.notes.includes(note.name),
                ).length;
                return (
                  <div className="equipment-row" key={note.id}>
                    <button
                      className="equipment-name"
                      disabled={busy !== null}
                      onClick={() => edit(note)}
                    >
                      <strong>{note.name}</strong>
                      <span>
                        {used} {used === 1 ? "bean" : "beans"}
                      </span>
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy !== null}
                      aria-label={`Edit taste note ${note.name}`}
                      onClick={() => edit(note)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy !== null}
                      aria-label={`Delete taste note ${note.name}`}
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: `Delete ${note.name}?`,
                            description: used
                              ? `This removes the taste note from ${used} ${used === 1 ? "bean" : "beans"}.`
                              : "This removes the taste note from your suggestions.",
                            confirmLabel: "Delete taste note",
                            destructive: true,
                          }))
                        )
                          return;
                        setBusy(note.id);
                        setError("");
                        try {
                          await remove(note);
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Unable to delete taste note",
                          );
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </details>
          );
        })}
      </div>
      {!notes.length && (
        <p className="muted">
          {search ? "No matching taste notes." : "Add your first taste note."}
        </p>
      )}
      {confirmDialog}
    </section>
  );
}
