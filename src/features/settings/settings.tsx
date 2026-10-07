import { Check, Download, LogOut, Plus, Trash2 } from "lucide-react";
import { Choice, Data, Equipment } from "@/lib/domain/types";
import { TasteNotes } from "./taste-notes";
import { Button } from "@/components/ui/button";
const names: Record<Equipment["kind"], string> = {
  grinder: "Grinders",
  dripper: "Drippers",
  filter: "Paper Filters",
  moka: "Moka Pots",
  sweetener: "Sweeteners",
};
export function Settings({
  data,
  edit,
  remove,
  toggle,
  logout,
  editNote,
  removeNote,
  restoreNotes,
}: {
  data: Data;
  edit: (kind: Equipment["kind"], e?: Equipment) => void;
  remove: (e: Equipment) => void;
  toggle: (e: Equipment) => void;
  logout: () => void;
  editNote: (item?: Choice) => void;
  removeNote: (item: Choice) => Promise<void>;
  restoreNotes: () => Promise<void>;
}) {
  return (
    <>
      <div className="page-top">
        <div>
          <div className="eyebrow">MAKE IT YOURS</div>
          <h1>Your setup.</h1>
          <p className="muted">The tools behind your daily cup.</p>
        </div>
      </div>
      <div className="settings-grid">
        {(Object.keys(names) as Equipment["kind"][]).map((kind) => (
          <section key={kind} className="settings-section">
            <div className="section-heading">
              <h2>{names[kind]}</h2>
              <Button
                variant="ghost"
                aria-label={`Add ${kind}`}
                onClick={() => edit(kind)}
              >
                <Plus size={18} />
              </Button>
            </div>
            {data.equipment
              .filter((e) => e.kind === kind)
              .map((e) => (
                <div className="equipment-row" key={e.id}>
                  <button
                    className="equipment-name"
                    onClick={() => edit(kind, e)}
                  >
                    <strong>{e.name}</strong>
                    <span>
                      {e.is_default
                        ? "Default"
                        : kind === "grinder"
                          ? e.setting_type === "CUSTOM_TEXT"
                            ? "Custom text"
                            : e.setting_type === "CLICKS"
                              ? "Clicks"
                              : "Number"
                          : ""}
                    </span>
                  </button>
                  {kind === "filter" && (
                    <button
                      className={`availability ${e.available ? "available" : ""}`}
                      onClick={() => toggle(e)}
                    >
                      {e.available ? <Check size={13} /> : null}
                      {e.available ? "Available" : "Unavailable"}
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Delete ${e.name}`}
                    onClick={() => remove(e)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            {!data.equipment.some((e) => e.kind === kind) && (
              <p className="muted">
                Add your first {kind === "filter" ? "paper filter" : kind}.
              </p>
            )}
          </section>
        ))}
      </div>
      <TasteNotes
        data={data}
        edit={editNote}
        remove={removeNote}
        restore={restoreNotes}
      />
      <section className="settings-data">
        <div>
          <h2>Your notebook, yours to keep.</h2>
          <p className="muted">
            Download all your beans, recipes and brews as JSON.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const out = {
              exportVersion: 1,
              exportedAt: new Date().toISOString(),
              ...data,
              settings: { currency: "THB", theme: "light" },
            };
            const url = URL.createObjectURL(
                new Blob([JSON.stringify(out, null, 2)], {
                  type: "application/json",
                }),
              ),
              a = document.createElement("a");
            a.href = url;
            a.download = `brew-lab-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={17} /> Export JSON
        </Button>
      </section>
      <Button variant="ghost" onClick={logout}>
        <LogOut size={17} /> Logout
      </Button>
    </>
  );
}
