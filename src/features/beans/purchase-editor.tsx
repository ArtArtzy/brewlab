"use client";
import { useState } from "react";
import { pricePer100 } from "@/lib/domain/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function PurchaseEditor({
  beanId,
  save,
  close,
}: {
  beanId: string;
  save: (action: string, value: unknown) => Promise<void>;
  close: () => void;
}) {
  const [date, setDate] = useState(
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
        new Date(),
      ),
    ),
    [weight, setWeight] = useState(""),
    [price, setPrice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Dialog
      title="Buy again"
      description="A new bag, the same bean. Archived beans become Active again."
      onClose={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save("purchase", {
              bean_id: beanId,
              date,
              weight: Number(weight),
              price: Number(price),
            });
            close();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Purchase date
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Weight · g
            <input
              type="number"
              required
              min="1"
              step="any"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <label>
            Price · THB
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </div>
        {Number(weight) > 0 && (
          <p className="purchase-calculation">
            ฿
            {pricePer100(Number(price), Number(weight)).toLocaleString(
              undefined,
              { maximumFractionDigits: 2 },
            )}{" "}
            / 100g
          </p>
        )}
        {error && <p className="error">{error}</p>}
        <div className="form-footer">
          <Button disabled={busy}>Save purchase</Button>
        </div>
      </form>
    </Dialog>
  );
}
