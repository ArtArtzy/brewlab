"use client";
import { useState } from "react";
import { Archive, ChevronRight, Heart, Pin, Plus, Trash2 } from "lucide-react";
import {
  Bean,
  Brew,
  Data,
  Drink,
  Version,
  drinkNames,
  familyFor,
  pricePer100,
} from "@/lib/domain/types";
import { Cover } from "./bean-list";
import { Button } from "@/components/ui/button";
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(date.length === 10 ? date + "T12:00:00+07:00" : date));
export function BeanDetail({
  bean,
  data,
  edit,
  purchase,
  recipe,
  openPin,
  openBrew,
  archive,
  remove,
  deleteBrew,
}: {
  bean: Bean;
  data: Data;
  edit: () => void;
  purchase: () => void;
  recipe: (d: Drink, dose: number) => void;
  openPin: (v: Version) => void;
  openBrew: (b: Brew) => void;
  archive: () => void;
  remove: () => void;
  deleteBrew: (b: Brew) => void;
}) {
  const [filter, setFilter] = useState("All");
  const pins = data.recipe_pins.filter((p) => p.bean_id === bean.id),
    purchases = data.purchases
      .filter((p) => p.bean_id === bean.id)
      .sort((a, b) => b.date.localeCompare(a.date)),
    logs = data.brew_logs
      .filter(
        (b) =>
          b.bean_id === bean.id &&
          (filter === "All" ||
            (filter === "Pinned" &&
              pins.some((p) => p.version_id === b.source_version_id)) ||
            (filter === "Custom" && b.family === "AMERICANO_CUSTOM") ||
            (filter === "15g" && b.family === "AMERICANO_15") ||
            (filter === "20g" && b.family === "AMERICANO_20")),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <>
      <div className="bean-detail">
        <div className="bean-detail-left">
          <Cover bean={bean} big />
          <div className="detail-actions">
            <Button variant="outline" onClick={edit}>
              Edit bean
            </Button>
            <Button onClick={purchase}>Buy again</Button>
          </div>
        </div>
        <div className="bean-detail-right">
          <div className="eyebrow">
            {bean.status === "ARCHIVED" ? "ARCHIVED COFFEE" : "YOUR COFFEE"}
          </div>
          <h1>{bean.name}</h1>
          <p className="roaster-name">{bean.roaster}</p>
          {bean.rating && (
            <span className="bean-rating">
              <Heart size={15} />{" "}
              {bean.rating === "LOVE"
                ? "Love"
                : bean.rating === "LIKE"
                  ? "Like"
                  : "Dislike"}
            </span>
          )}
          <dl className="bean-meta">
            {[
              ["Origin", bean.origin],
              ["Process", bean.process],
              ["Roast", bean.roast],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          <div className="chips">
            {bean.notes.map((n) => (
              <span className="chip static" key={n}>
                {n}
              </span>
            ))}
          </div>
          <section>
            <h2>Recommended recipes</h2>
            {(["AMERICANO", "HOT_LATTE", "ICED_LATTE"] as Drink[]).flatMap(
              (drink) =>
                (drink === "AMERICANO" ? [15, 20] : [18]).map((d) => (
                  <button
                    className="recipe-list-row"
                    key={drink + d}
                    onClick={() => recipe(drink, d)}
                  >
                    <div>
                      <strong>
                        {drinkNames[drink]}{" "}
                        {drink === "AMERICANO" ? `· ${d}g` : ""}
                      </strong>
                      <span>
                        {data.recipe_families.some(
                          (f) =>
                            f.bean_id === bean.id &&
                            f.family === familyFor(drink, d),
                        )
                          ? "Latest recipe"
                          : "No recipe yet"}
                      </span>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                )),
            )}
          </section>
          <section>
            <h2>Pinned recipes</h2>
            {pins.length ? (
              pins.map((p) => {
                const v = data.recipe_versions.find(
                  (v) => v.id === p.version_id,
                );
                return (
                  v && (
                    <button
                      className="recipe-list-row"
                      key={p.id}
                      onClick={() => openPin(v)}
                    >
                      <div>
                        <strong>
                          <Pin size={14} /> {p.label}
                        </strong>
                        <span>
                          {drinkNames[v.snapshot.drink]} · {v.snapshot.dose}g
                        </span>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  )
                );
              })
            ) : (
              <p className="muted">Save a recipe you want to come back to.</p>
            )}
          </section>
        </div>
      </div>
      <div className="detail-bottom">
        <section>
          <div className="section-heading">
            <h2>Purchase history</h2>
            <Button variant="ghost" onClick={purchase}>
              <Plus size={16} /> Buy again
            </Button>
          </div>
          {purchases.map((p) => (
            <div className="purchase-row" key={p.id}>
              <strong>{formatDate(p.date)}</strong>
              <span>{p.weight}g</span>
              <span>฿{p.price.toLocaleString()}</span>
              <small>
                ฿
                {pricePer100(p.price, p.weight).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                / 100g
              </small>
            </div>
          ))}
          {!purchases.length && (
            <p className="muted">No purchases recorded yet.</p>
          )}
        </section>
        <section>
          <h2>Brew history</h2>
          <div className="chips history-chips">
            {["All", "15g", "20g", "Custom", "Pinned"].map((f) => (
              <button
                key={f}
                className={`chip ${filter === f ? "selected" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {logs.length ? (
            logs.map((b) => (
              <div className="brew-history-row" key={b.id}>
                <button onClick={() => openBrew(b)}>
                  <strong>
                    {drinkNames[b.snapshot.drink]} · {b.snapshot.dose}g
                  </strong>
                  <span>
                    {b.rating ? `★ ${b.rating}/5 · ` : ""}
                    {b.feedback.join(" · ") || "No feedback"}
                  </span>
                  <small>{formatDate(b.created_at)}</small>
                </button>
                <button
                  className="icon-button"
                  aria-label="Delete brew"
                  onClick={() => deleteBrew(b)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty small-empty">
              <h3>No brew history yet</h3>
              <p>Your brews for this bean will appear here.</p>
            </div>
          )}
        </section>
      </div>
      <div className="danger-actions">
        <Button variant="ghost" onClick={archive}>
          <Archive size={16} />{" "}
          {bean.status === "ACTIVE" ? "Archive Bean" : "Restore Bean"}
        </Button>
        <Button variant="ghost" onClick={remove}>
          <Trash2 size={16} /> Delete Bean
        </Button>
      </div>
    </>
  );
}
