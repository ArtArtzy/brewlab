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

describe("Taste note management", () => {
  beforeAll(async () => {
    await db.exec(
      readFileSync(
        "supabase/migrations/20261006231246_manage_taste_notes.sql",
        "utf8",
      ),
    );
  });
  it("renames tags on beans, preserves note order and updates relational links", async () => {
    const {
      rows: [note],
    } = await db.query<{ id: string }>(
      "insert into choices(kind,name,category) values('note','Test old note','Fruity') returning id",
    );
    const {
      rows: [bean],
    } = await db.query<{ id: string }>(
      "insert into beans(name,roaster,notes) values('Note test','Test',array['Honey','Test old note','Cocoa']) returning id",
    );
    await db.query(
      "select manage_taste_note($1,'Test renamed note','Sweet',false)",
      [note.id],
    );
    const updated = await db.query<{ notes: string[] }>(
      "select notes from beans where id=$1",
      [bean.id],
    );
    expect(updated.rows[0].notes).toEqual([
      "Honey",
      "Test renamed note",
      "Cocoa",
    ]);
    const tags = await db.query<{
      name: string;
      category: string;
      note_id: string;
    }>(
      "select c.name,c.category,n.note_id from bean_taste_notes n join choices c on c.id=n.note_id where n.bean_id=$1 and n.note_id=$2",
      [bean.id, note.id],
    );
    expect(tags.rows[0]).toEqual({
      name: "Test renamed note",
      category: "Sweet",
      note_id: note.id,
    });
    expect(
      (await db.query("select id from choices where name='Test old note'"))
        .rows,
    ).toHaveLength(0);
  });
  it("rejects duplicate names without partially changing beans or tags", async () => {
    const {
      rows: [note],
    } = await db.query<{ id: string }>(
      "select id from choices where name='Test renamed note'",
    );
    await expect(
      db.query("select manage_taste_note($1,'Honey','Other',false)", [note.id]),
    ).rejects.toThrow("already exists");
    const unchanged = await db.query<{ name: string; category: string }>(
      "select name,category from choices where id=$1",
      [note.id],
    );
    expect(unchanged.rows[0]).toEqual({
      name: "Test renamed note",
      category: "Sweet",
    });
    expect(
      (
        await db.query(
          "select id from beans where notes @> array['Test renamed note']",
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("deletes a used tag from beans and relational links while keeping other notes", async () => {
    const {
      rows: [note],
    } = await db.query<{ id: string }>(
      "select id from choices where name='Test renamed note'",
    );
    await db.query("select manage_taste_note($1,null,null,true)", [note.id]);
    const bean = await db.query<{ notes: string[] }>(
      "select notes from beans where name='Note test'",
    );
    expect(bean.rows[0].notes).toEqual(["Honey", "Cocoa"]);
    expect(
      (
        await db.query("select * from bean_taste_notes where note_id=$1", [
          note.id,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select * from choices where id=$1", [note.id])).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select manage_taste_note($1,null,null,true)", [note.id]),
    ).rejects.toThrow("not found");
  });
});
describe("Common taste note suggestions", () => {
  it("restores every category without duplicating capitalization variants or changing bean selections", async () => {
    await db.exec(
      "update choices set category='Other' where kind='note' and name in ('Rose','Brown Sugar','Chocolate'); delete from choices where kind='note' and name='Jasmine'; insert into choices(kind,name,category) values('note','BlackBerry','Fruity');",
    );
    const before = await db.query("select id,notes from beans order by id");
    const sql = readFileSync(
      "supabase/migrations/20261006233256_restore_common_taste_notes.sql",
      "utf8",
    );
    await db.exec(sql);
    const category = await db.query<{ name: string; category: string }>(
      "select name,category from choices where name in ('Rose','Brown Sugar','Chocolate') order by name",
    );
    expect(category.rows).toEqual([
      { name: "Brown Sugar", category: "Sweet" },
      { name: "Chocolate", category: "Chocolate / Nutty" },
      { name: "Rose", category: "Floral" },
    ]);
    expect(
      (
        await db.query(
          "select id from choices where kind='note' and lower(name)='blackberry'",
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          "select id from choices where name='Jasmine' and category='Floral'",
        )
      ).rows,
    ).toHaveLength(1);
    const groups = await db.query(
      "select distinct category from choices where kind='note'",
    );
    expect(groups.rows).toHaveLength(5);
    expect(
      (await db.query("select id,notes from beans order by id")).rows,
    ).toEqual(before.rows);
    const count = await db.query("select count(*) from choices");
    await db.exec(sql);
    expect((await db.query("select count(*) from choices")).rows).toEqual(
      count.rows,
    );
  });
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
