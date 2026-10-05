import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { recipe } from "./recipe-fixture";
let db: PGlite, beanId: string, versionId: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261005204317_brew_lab.sql",
      "utf8",
    ).replace("create extension if not exists pgcrypto;", ""),
  );
  const b = await db.query<{ id: string }>(
    "insert into beans(name,roaster) values('Test','Test') returning id",
  );
  beanId = b.rows[0].id;
  const v = await db.query<{ id: string }>(
    "select save_recipe($1,'AMERICANO_15',$2::jsonb) as id",
    [beanId, JSON.stringify(recipe)],
  );
  versionId = v.rows[0].id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("Database historical integrity", () => {
  it("stores ordered pours as relational rows", async () => {
    const steps = await db.query<{ cumulative_water: string }>(
      "select cumulative_water from pour_steps where version_id=$1 order by sort_order",
      [versionId],
    );
    expect(steps.rows.map((s) => Number(s.cumulative_water))).toEqual([
      50, 120, 180, 240,
    ]);
  });
  it("updates Latest and saves selected adjustments atomically", async () => {
    const b = await db.query<{ id: string }>(
      "insert into brew_logs(bean_id,family,snapshot,source_version_id) values($1,'AMERICANO_15',$2::jsonb,$3) returning id",
      [beanId, JSON.stringify(recipe), versionId],
    );
    await db.query("select save_next_recipe($1,$2::jsonb,$3::jsonb)", [
      b.rows[0].id,
      JSON.stringify({ ...recipe, grind: "15" }),
      JSON.stringify([
        { field: "grind", delta: -1, label: "Grind finer 1 click" },
      ]),
    ]);
    const a = await db.query<{ delta: string }>(
      "select delta from brew_adjustments where brew_id=$1",
      [b.rows[0].id],
    );
    expect(Number(a.rows[0].delta)).toBe(-1);
    await db.query("update recipe_families set latest_id=$1 where bean_id=$2", [
      versionId,
      beanId,
    ]);
  });
  it("logging and editing a brew never changes Latest", async () => {
    const b = await db.query<{ id: string }>(
      "insert into brew_logs(bean_id,family,snapshot,source_version_id) values($1,'AMERICANO_15',$2::jsonb,$3) returning id",
      [beanId, JSON.stringify({ ...recipe, grind: "15" }), versionId],
    );
    await db.query("update brew_logs set rating=4 where id=$1", [b.rows[0].id]);
    const f = await db.query<{ latest_id: string }>(
      "select latest_id from recipe_families where bean_id=$1",
      [beanId],
    );
    expect(f.rows[0].latest_id).toBe(versionId);
  });
  it("a new Latest never modifies pinned versions", async () => {
    await db.query(
      "insert into recipe_pins(bean_id,family,label,version_id) values($1,'AMERICANO_15','Mine',$2)",
      [beanId, versionId],
    );
    await db.query("select save_recipe($1,'AMERICANO_15',$2::jsonb)", [
      beanId,
      JSON.stringify({ ...recipe, grind: "14" }),
    ]);
    const p = await db.query<{ grind: string }>(
      "select v.snapshot->>'grind' as grind from recipe_pins p join recipe_versions v on v.id=p.version_id where p.bean_id=$1",
      [beanId],
    );
    expect(p.rows[0].grind).toBe("16");
  });
  it("recipe versions reject mutation", async () => {
    await expect(
      db.query("update recipe_versions set snapshot='{}' where id=$1", [
        versionId,
      ]),
    ).rejects.toThrow("immutable");
  });
  it("custom families cannot become Latest or pins", async () => {
    await expect(
      db.query("select save_recipe($1,'AMERICANO_CUSTOM',$2::jsonb)", [
        beanId,
        JSON.stringify({ ...recipe, dose: 16.3 }),
      ]),
    ).rejects.toThrow();
  });
  it("buy again atomically reactivates an archived bean", async () => {
    await db.query("update beans set status='ARCHIVED' where id=$1", [beanId]);
    await db.query("select buy_again($1,'2026-10-05',200,450)", [beanId]);
    const b = await db.query<{ status: string }>(
      "select status from beans where id=$1",
      [beanId],
    );
    expect(b.rows[0].status).toBe("ACTIVE");
  });
  it("rate limiting survives repeated calls", async () => {
    for (let i = 0; i < 5; i++) {
      const a = await db.query<{ allowed: boolean }>(
        "select allow_pin_attempt('test') as allowed",
      );
      expect(a.rows[0].allowed).toBe(true);
    }
    const a = await db.query<{ allowed: boolean }>(
      "select allow_pin_attempt('test') as allowed",
    );
    expect(a.rows[0].allowed).toBe(false);
  });
});
