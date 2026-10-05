import {
  Bean,
  Brew,
  Drink,
  Equipment,
  Recipe,
  Version,
} from "@/lib/domain/types";
export type Screen =
  | { type: "home" }
  | { type: "beans" }
  | { type: "settings" }
  | { type: "choose"; drink: Drink }
  | { type: "detail"; beanId: string }
  | { type: "dose"; beanId: string; drink: Drink }
  | {
      type: "recipe";
      beanId: string;
      drink: Drink;
      dose: number;
      versionId?: string;
    };
export type Modal =
  | { type: "bean"; bean?: Bean }
  | { type: "editor"; recipe: Recipe; beanId: string }
  | {
      type: "brew";
      recipe: Recipe;
      beanId: string;
      versionId: string | null;
      brew?: Brew;
    }
  | { type: "purchase"; beanId: string }
  | { type: "equipment"; kind: Equipment["kind"]; item?: Equipment }
  | { type: "pin"; version: Version }
  | null;
