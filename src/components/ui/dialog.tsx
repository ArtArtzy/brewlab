"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
export function Dialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <D.Root
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <D.Portal>
        <D.Overlay className="dialog-overlay" />
        <D.Content
          className="dialog-content"
          aria-describedby={description ? "dialog-description" : undefined}
        >
          <div className="dialog-head">
            <div>
              <D.Title>{title}</D.Title>
              {description && (
                <D.Description id="dialog-description">
                  {description}
                </D.Description>
              )}
            </div>
            <D.Close className="icon-button" aria-label="Close">
              <X size={20} />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
