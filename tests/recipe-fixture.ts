import { Recipe } from "../src/lib/domain/types";
export const recipe: Recipe = {
  drink: "AMERICANO",
  dose: 15,
  water: 240,
  grinder: "Timemore C3s",
  settingType: "CLICKS",
  grind: "16",
  dripper: "Origami Air M",
  filter: "CAFEC Abaca",
  moka: "",
  milk: 0,
  sweetener: "",
  sweetenerAmount: 0,
  finishMin: 140,
  finishMax: 160,
  wait: 5,
  steps: [
    {
      time: 0,
      water: 50,
      temperature: 93,
      patterns: ["Circular", "Slow Pour"],
    },
    { time: 40, water: 120, temperature: 93, patterns: ["Circular"] },
    { time: 70, water: 180, temperature: 91, patterns: ["Center Pour"] },
    { time: 100, water: 240, temperature: 88, patterns: ["Center Pour"] },
  ],
};
