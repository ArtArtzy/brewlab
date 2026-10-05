"use client";
import { useState } from "react";
import { Equipment } from "@/lib/domain/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function EquipmentEditor({
  item,
  kind,
  save,
  close,
}: {
  item?: Equipment;
  kind: Equipment["kind"];
  save: (action: string, value: unknown, id?: string) => Promise<void>;
  close: () => void;
}) {
  const [name, setName] = useState(item?.name || ""),
    [type, setType] = useState(item?.setting_type || "CLICKS"),
    [defaultValue, setDefault] = useState(item?.is_default || false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog
      title={`${item ? "Edit" : "Add"} ${kind === "filter" ? "paper filter" : kind === "moka" ? "moka pot" : kind}`}
      onClose={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(
              "equipment",
              {
                name,
                kind,
                setting_type: type,
                available: item?.available ?? true,
                is_default: defaultValue,
              },
              item?.id,
            );
            close();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to save");
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
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {kind === "grinder" && (
          <label>
            Setting type
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as Equipment["setting_type"])
              }
            >
              <option value="CLICKS">Clicks</option>
              <option value="NUMBER">Number</option>
              <option value="CUSTOM_TEXT">Custom text</option>
            </select>
          </label>
        )}
        {kind !== "filter" && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={defaultValue}
              onChange={(e) => setDefault(e.target.checked)}
            />{" "}
            Use as default
          </label>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Button disabled={busy}>Save</Button>
        </div>
      </form>
    </Dialog>
  );
}
