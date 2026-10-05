import { Recipe, ratio, timeLabel } from "@/lib/domain/types";
export function RecipeView({
  recipe: r,
  compact = false,
}: {
  recipe: Recipe;
  compact?: boolean;
}) {
  return (
    <div className={`recipe-reference ${compact ? "compact" : ""}`}>
      <div className="recipe-numbers">
        <div>
          <span>Coffee</span>
          <strong>
            {r.dose}
            <small>g</small>
          </strong>
        </div>
        <span className="recipe-arrow">→</span>
        <div>
          <span>{r.drink === "AMERICANO" ? "Water" : "Milk"}</span>
          <strong>
            {r.drink === "AMERICANO" ? r.water : r.milk}
            <small>g</small>
          </strong>
        </div>
        {r.drink === "AMERICANO" && (
          <div className="ratio">
            <span>Brew ratio</span>
            <strong>1:{ratio(r.dose, r.water)}</strong>
          </div>
        )}
      </div>
      <div className="recipe-equipment">
        <p>
          {r.grinder} <span>·</span>{" "}
          <strong>
            {r.grind}
            {r.settingType === "CLICKS" ? " clicks" : ""}
          </strong>
        </p>
        <p>{r.drink === "AMERICANO" ? `${r.dripper} · ${r.filter}` : r.moka}</p>
        {r.drink !== "AMERICANO" && (
          <p>
            {r.sweetener} <span>·</span> <strong>{r.sweetenerAmount}g</strong>
          </p>
        )}
      </div>
      {r.drink === "AMERICANO" && (
        <>
          <div className="pour-table">
            <div className="pour-table-head">
              <span>Start</span>
              <span>Scale target</span>
              <span>Temperature</span>
            </div>
            {r.steps.map((s, i) => (
              <div className="pour-row" key={i}>
                <div className="pour-time">{timeLabel(s.time)}</div>
                <div>
                  <strong>Pour to {s.water}g</strong>
                  <p>{s.patterns.join(" · ")}</p>
                </div>
                <div className="pour-temp">{s.temperature}°C</div>
              </div>
            ))}
          </div>
          <div className="finish-row">
            <div>
              <span>Target finish</span>
              <strong>
                {timeLabel(r.finishMin)}–{timeLabel(r.finishMax)}
              </strong>
            </div>
            <div>
              <span>Drink after</span>
              <strong>{r.wait} min</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
