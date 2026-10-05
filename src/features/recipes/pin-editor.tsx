"use client";
import { useState } from "react";
import { Data, Version } from "@/lib/domain/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function PinEditor({
  version,
  data,
  mutate,
  close,
}: {
  version: Version;
  data: Data;
  mutate: (p: Record<string, unknown>) => Promise<void>;
  close: () => void;
}) {
  const [label, setLabel] = useState("Love it"),
    [custom, setCustom] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const final = label === "Custom" ? custom.trim() : label,
    exists = data.recipe_pins.some(
      (p) =>
        p.bean_id === version.bean_id &&
        p.family === version.family &&
        p.label === final,
    );
  return (
    <Dialog
      title="Keep this recipe"
      description="A pinned recipe is a snapshot. It stays exactly as it is."
      onClose={close}
    >
      <div className="chips">
        {["Love it", "Wife", "Mine", "Custom"].map((l) => (
          <button
            key={l}
            className={`chip ${label === l ? "selected" : ""}`}
            onClick={() => setLabel(l)}
          >
            {l}
          </button>
        ))}
      </div>
      {label === "Custom" && (
        <label>
          Custom label
          <input
            maxLength={60}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
      )}
      {exists && (
        <p className="custom-notice">
          This label already exists. Replacing it updates this pin only.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="form-footer">
        <Button
          disabled={!final || busy}
          onClick={async () => {
            if (exists && !confirm(`Replace your ${final} pinned recipe?`))
              return;
            setBusy(true);
            try {
              await mutate({
                action: "pin",
                versionId: version.id,
                label: final,
              });
              close();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to pin");
            } finally {
              setBusy(false);
            }
          }}
        >
          {exists ? "Replace pinned recipe" : "Pin recipe"}
        </Button>
      </div>
    </Dialog>
  );
}
