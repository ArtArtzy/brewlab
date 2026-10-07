import { NextRequest, NextResponse } from "next/server";
import { db, check } from "@/lib/server/db";
import { requireSession } from "@/lib/server/session";
import {
  beanSchema,
  recipeSchema,
  canonical,
  familyFor,
  adjustmentSchema,
  categories,
  noteSeeds,
} from "@/lib/domain/types";
import { z } from "zod";
const tables = [
  "beans",
  "recipe_versions",
  "recipe_families",
  "recipe_pins",
  "brew_logs",
  "equipment",
  "choices",
  "purchases",
  "taste_note_categories",
  "bean_taste_notes",
  "pour_steps",
  "brew_log_pour_steps",
  "brew_feedback",
  "brew_adjustments",
] as const;
export async function GET() {
  try {
    await requireSession();
    const entries = await Promise.all(
      tables.map(async (t) => {
        const rows: Record<string, unknown>[] = [];
        // Supabase's default response cap is 1,000 rows; export every record.
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await db()
            .from(t)
            .select("*")
            .order(t === "bean_taste_notes" ? "bean_id" : "id")
            .range(offset, offset + 499);
          check(error);
          rows.push(...(data || []));
          if (!data || data.length < 500) break;
        }
        return [t, rows];
      }),
    );
    return NextResponse.json(Object.fromEntries(entries), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
function fail(e: unknown) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Unable to save" },
    {
      status:
        e instanceof Error && e.message === "Please unlock Brew Lab."
          ? 401
          : 400,
    },
  );
}
export async function POST(req: NextRequest) {
  try {
    if (
      req.headers.get("origin") !==
      new URL(process.env.APP_ORIGIN || req.url).origin
    )
      throw new Error("Invalid origin");
    await requireSession();
    const b = await req.json(),
      id = b.id ? z.uuid().parse(b.id) : undefined;
    const client = db();
    if (b.action === "bean") {
      const value = beanSchema.parse(b.value);
      if (id) {
        const { data: old } = await client
          .from("beans")
          .select("cover")
          .eq("id", id)
          .single();
        const { error } = await client.from("beans").update(value).eq("id", id);
        check(error);
        if (old?.cover && old.cover !== value.cover)
          check(
            (await client.storage.from("bean-covers").remove([old.cover]))
              .error,
          );
      } else check((await client.from("beans").insert(value)).error);
    } else if (b.action === "deleteBean") {
      const { data } = await client
        .from("beans")
        .select("cover")
        .eq("id", id)
        .single();
      check((await client.from("beans").delete().eq("id", id)).error);
      if (data?.cover)
        check(
          (await client.storage.from("bean-covers").remove([data.cover])).error,
        );
    } else if (b.action === "recipe") {
      const r = recipeSchema.parse(b.value);
      if (!canonical(r)) throw new Error("Custom doses cannot change Latest.");
      check(
        (
          await client.rpc("save_recipe", {
            p_bean: z.uuid().parse(b.beanId),
            p_family: familyFor(r.drink, r.dose),
            p_snapshot: r,
          })
        ).error,
      );
    } else if (b.action === "nextRecipe") {
      const r = recipeSchema.parse(b.value.recipe),
        brewId = z.uuid().parse(b.value.brewId),
        adjustments = z.array(adjustmentSchema).parse(b.value.adjustments);
      const { data: brew, error } = await client
        .from("brew_logs")
        .select("bean_id,family")
        .eq("id", brewId)
        .single();
      check(error);
      if (!brew) throw new Error("Brew log not found.");
      if (
        !canonical(r) ||
        brew.family === "AMERICANO_CUSTOM" ||
        familyFor(r.drink, r.dose) !== brew.family
      )
        throw new Error(
          "Custom dose feedback cannot change a canonical recipe.",
        );
      check(
        (
          await client.rpc("save_next_recipe", {
            p_brew: brewId,
            p_snapshot: r,
            p_adjustments: adjustments,
          })
        ).error,
      );
    } else if (b.action === "pin") {
      const { data: v, error } = await client
        .from("recipe_versions")
        .select("*")
        .eq("id", z.uuid().parse(b.versionId))
        .single();
      check(error);
      if (!canonical(recipeSchema.parse(v.snapshot)))
        throw new Error("Custom doses cannot be pinned.");
      check(
        (
          await client.from("recipe_pins").upsert(
            {
              bean_id: v.bean_id,
              family: v.family,
              version_id: v.id,
              label: z.string().trim().min(1).max(60).parse(b.label),
            },
            { onConflict: "bean_id,family,label" },
          )
        ).error,
      );
    } else if (b.action === "purchase") {
      const v = z
        .object({
          bean_id: z.uuid(),
          date: z.iso.date(),
          weight: z.number().positive().max(100000),
          price: z.number().min(0).max(1000000),
        })
        .parse(b.value);
      check(
        (
          await client.rpc("buy_again", {
            p_bean: v.bean_id,
            p_date: v.date,
            p_weight: v.weight,
            p_price: v.price,
          })
        ).error,
      );
    } else if (b.action === "brew") {
      const v = z
        .object({
          bean_id: z.uuid(),
          source_version_id: z.uuid().nullable(),
          family: z.string().min(1),
          snapshot: recipeSchema,
          rating: z.number().int().min(1).max(5).nullable(),
          feedback: z.array(z.string().max(60)).max(12),
          note: z.string().max(4000),
          adjustments: z.array(
            z.object({
              field: z.enum([
                "grind",
                "temperature",
                "water",
                "milk",
                "sweetenerAmount",
                "dose",
                "agitation",
              ]),
              delta: z.number().min(-500).max(500),
              label: z.string().max(120),
            }),
          ),
        })
        .parse(b.value);
      if (id)
        check((await client.from("brew_logs").update(v).eq("id", id)).error);
      else
        check(
          (
            await client
              .from("brew_logs")
              .insert({ ...v, id: z.uuid().parse(b.value.created_id) })
          ).error,
        );
    } else if (b.action === "deleteBrew")
      check((await client.from("brew_logs").delete().eq("id", id)).error);
    else if (b.action === "equipment") {
      const v = z
        .object({
          name: z.string().trim().min(1).max(120),
          kind: z.enum(["grinder", "dripper", "filter", "moka", "sweetener"]),
          setting_type: z.enum(["CLICKS", "NUMBER", "CUSTOM_TEXT"]),
          available: z.boolean(),
          is_default: z.boolean(),
        })
        .parse(b.value);
      check(
        (await client.rpc("save_equipment", { p_id: id || null, p_value: v }))
          .error,
      );
    } else if (b.action === "deleteEquipment")
      check((await client.from("equipment").delete().eq("id", id)).error);
    else if (b.action === "seedTasteNotes") {
      const { data: existing, error } = await client
        .from("choices")
        .select("name")
        .eq("kind", "note");
      check(error);
      const names = new Set((existing || []).map((n) => n.name.toLowerCase()));
      const category =
        b.value?.category === undefined
          ? undefined
          : z
              .string()
              .refine((c) => categories.includes(c), "Choose a taste category.")
              .parse(b.value.category);
      const notes = Object.entries(noteSeeds)
        .filter(([c]) => category === undefined || c === category)
        .flatMap(([category, suggested]) =>
          suggested
            .filter((name) => !names.has(name.toLowerCase()))
            .map((name) => ({ kind: "note", name, category })),
        );
      if (notes.length)
        check(
          (
            await client
              .from("choices")
              .upsert(notes, {
                onConflict: "kind,name",
                ignoreDuplicates: true,
              })
          ).error,
        );
    } else if (b.action === "tasteNote" || b.action === "deleteTasteNote") {
      const noteId = z.uuid().parse(id);
      const deleting = b.action === "deleteTasteNote";
      const value = deleting
        ? null
        : z
            .object({
              name: z.string().trim().min(1).max(80),
              category: z.enum([
                "Fruity",
                "Floral",
                "Sweet",
                "Chocolate / Nutty",
                "Other",
              ]),
            })
            .parse(b.value);
      check(
        (
          await client.rpc("manage_taste_note", {
            p_id: noteId,
            p_name: value?.name ?? null,
            p_category: value?.category ?? null,
            p_delete: deleting,
          })
        ).error,
      );
    } else if (b.action === "choice") {
      const v = z
        .object({
          kind: z.enum(["note", "process", "pattern"]),
          name: z.string().trim().min(1).max(80),
          category: z.string().max(80),
        })
        .parse(b.value);
      if (v.kind === "note" && !categories.includes(v.category))
        throw new Error("Choose a taste category.");
      check(
        (await client.from("choices").upsert(v, { onConflict: "kind,name" }))
          .error,
      );
    } else throw new Error("Unknown action");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
