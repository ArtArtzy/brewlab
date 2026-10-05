import { ArrowRight, Coffee, Sun, Snowflake } from "lucide-react";
import { Drink, drinkNames } from "@/lib/domain/types";
export function Home({ choose }: { choose: (d: Drink) => void }) {
  const options = [
    { drink: "AMERICANO" as Drink, Icon: Coffee, method: "Pour over" },
    { drink: "HOT_LATTE" as Drink, Icon: Sun, method: "Moka pot" },
    { drink: "ICED_LATTE" as Drink, Icon: Snowflake, method: "Moka pot" },
  ];
  return (
    <>
      <div className="home-intro">
        <div className="eyebrow">
          <span className="tiny-line" /> YOUR DAILY RITUAL
        </div>
        <h1>
          What would you
          <br />
          like today<span className="brand-dot">?</span>
        </h1>
      </div>
      <div className="drink-grid">
        {options.map(({ drink, Icon, method }, i) => (
          <button
            className={`drink-card drink-${i}`}
            key={drink}
            onClick={() => choose(drink)}
          >
            <span className="drink-index">0{i + 1}</span>
            <div className="drink-symbol" aria-hidden="true">
              <Icon size={40} strokeWidth={1} />
            </div>
            <div className="drink-title">
              <div>
                <h2>{drinkNames[drink]}</h2>
                <p>{method}</p>
              </div>
              <span className="drink-arrow">
                <ArrowRight size={20} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
