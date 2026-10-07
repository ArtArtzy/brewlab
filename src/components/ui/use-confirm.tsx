"use client";
import { useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Dialog } from "./dialog";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);
  const ask = (next: ConfirmOptions) =>
    new Promise<boolean>((done) => {
      resolve.current = done;
      setOptions(next);
    });
  const finish = (confirmed: boolean) => {
    resolve.current?.(confirmed);
    resolve.current = null;
    setOptions(null);
  };
  const dialog = options ? (
    <Dialog
      title={options.title}
      description={options.description}
      onClose={() => finish(false)}
      className="confirm-dialog"
    >
      <div className={`confirm-mark ${options.destructive ? "danger" : ""}`}>
        <AlertTriangle size={22} aria-hidden="true" />
      </div>
      <div className="form-footer confirm-actions">
        <Button type="button" variant="outline" onClick={() => finish(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          className={options.destructive ? "danger" : ""}
          onClick={() => finish(true)}
        >
          {options.confirmLabel || "Continue"}
        </Button>
      </div>
    </Dialog>
  ) : null;
  return { ask, dialog };
}
