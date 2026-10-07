"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId } from "react";
export function Dialog({
  title,
  description,
  children,
  onClose,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const descriptionId = useId();
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
          className={`dialog-content ${className || ""}`}
          aria-describedby={description ? descriptionId : undefined}
        >
          <div className="dialog-head">
            <div>
              <D.Title>{title}</D.Title>
              {description && (
                <D.Description id={descriptionId}>{description}</D.Description>
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
