"use client";
import { useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Heart,
  ChevronRight,
  Bean as BeanIcon,
} from "lucide-react";
import { Bean, Data, Drink, categories, roasts } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/brand";
import Image from "next/image";
export function Cover({ bean, big = false }: { bean: Bean; big?: boolean }) {
  return (
    <div className={`bean-cover ${big ? "big" : ""}`}>
      {bean.cover ? (
        <Image
          unoptimized
          width={1200}
          height={1200}
          src={`/api/cover?path=${encodeURIComponent(bean.cover)}`}
          alt={`${bean.name} coffee bag`}
        />
      ) : (
        <div className="cover-placeholder">
          <Mark size={40} />
          <span>{bean.roaster}</span>
          <strong>{bean.name}</strong>
          <small>COFFEE BEANS</small>
        </div>
      )}
    </div>
  );
}
export function BeanList({
  data,
  drink,
  add,
  select,
}: {
  data: Data;
  drink?: Drink;
  add: () => void;
  select: (b: Bean) => void;
}) {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("ACTIVE"),
    [sort, setSort] = useState("Recently brewed"),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [showFilters, setShowFilters] = useState(false),
    [showAll, setShowAll] = useState(false);
  let beans = data.beans.filter(
    (b) =>
      (drink ? showAll || b.status === "ACTIVE" : b.status === status) &&
      `${b.name} ${b.roaster} ${b.notes.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (!drink) {
    beans = beans.filter((b) =>
      Object.entries(filters).every(
        ([k, v]) =>
          !v ||
          (k === "note"
            ? b.notes.includes(v)
            : k === "category"
              ? b.notes.some((n) =>
                  data.choices.some(
                    (c) =>
                      c.kind === "note" && c.name === n && c.category === v,
                  ),
                )
              : b[k as keyof Bean] === v),
      ),
    );
    const recent = (b: Bean) =>
      data.brew_logs
        .filter((l) => l.bean_id === b.id)
        .map((l) => l.created_at)
        .sort()
        .at(-1) || b.created_at;
    beans.sort((a, b) =>
      sort === "Name A–Z"
        ? a.name.localeCompare(b.name)
        : sort === "Love first"
          ? Number(b.rating === "LOVE") - Number(a.rating === "LOVE")
          : sort === "Recently added"
            ? b.created_at.localeCompare(a.created_at)
            : recent(b).localeCompare(recent(a)),
    );
  } else {
    const rank =
      drink === "AMERICANO"
        ? ["Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"]
        : ["Medium", "Medium-Dark", "Dark", "Medium-Light", "Light"];
    beans.sort(
      (a, b) =>
        (rank.indexOf(a.roast) < 0 ? 99 : rank.indexOf(a.roast)) -
        (rank.indexOf(b.roast) < 0 ? 99 : rank.indexOf(b.roast)),
    );
  }
  return (
    <>
      <div className="page-top">
        <div>
          <div className="eyebrow">
            {drink ? "STEP 01 / YOUR COFFEE" : "THE COLLECTION"}
          </div>
          <h1>{drink ? "Choose your bean." : "Your beans."}</h1>
          <p className="muted">
            {drink
              ? "A familiar favourite, or something new."
              : "The coffees you’re getting to know."}
          </p>
        </div>
        <Button onClick={add}>
          <Plus size={17} /> Add bean
        </Button>
      </div>
      <div className="search-row">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Search beans"
            placeholder="Search beans, roasters or taste notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {!drink && (
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={17} /> Filters{" "}
            {Object.values(filters).filter(Boolean).length || ""}
          </Button>
        )}
      </div>
      {!drink ? (
        <>
          <div className="list-toolbar">
            <div className="chips">
              {["ACTIVE", "ARCHIVED"].map((s) => (
                <button
                  className={`chip ${status === s ? "selected" : ""}`}
                  key={s}
                  onClick={() => setStatus(s)}
                >
                  {s === "ACTIVE" ? "Active" : "Archived"}
                </button>
              ))}
            </div>
            <label className="sort-control">
              Sort
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {[
                  "Recently brewed",
                  "Recently added",
                  "Name A–Z",
                  "Love first",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          {showFilters && (
            <div className="filter-panel form-grid">
              {[
                [
                  "roaster",
                  "Roaster",
                  [...new Set(data.beans.map((b) => b.roaster))],
                ],
                ["roast", "Roast", roasts],
                [
                  "process",
                  "Process",
                  [
                    ...new Set(
                      data.beans.map((b) => b.process).filter(Boolean),
                    ),
                  ],
                ],
                ["category", "Taste category", categories],
                [
                  "note",
                  "Taste note",
                  [...new Set(data.beans.flatMap((b) => b.notes))],
                ],
                ["rating", "Bean rating", ["DISLIKE", "LIKE", "LOVE"]],
              ].map(([key, label, options]) => (
                <label key={key as string}>
                  {label}
                  <select
                    value={filters[key as string] || ""}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        [key as string]: e.target.value,
                      }))
                    }
                  >
                    <option value="">All</option>
                    {(options as string[]).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              ))}
              <Button variant="ghost" onClick={() => setFilters({})}>
                Clear filters
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="list-toolbar">
          <span className="muted">
            {showAll ? "All beans" : "Active beans · suggested roast order"}
          </span>
          <button className="text-button" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show active beans" : "Show all beans"}
          </button>
        </div>
      )}
      {beans.length ? (
        <div className={drink ? "bean-select-grid" : "bean-management-grid"}>
          {beans.map((b) => (
            <button className="bean-card" key={b.id} onClick={() => select(b)}>
              <Cover bean={b} />
              <div className="bean-card-body">
                <div className="row between">
                  <span className="eyebrow">{b.roaster}</span>
                  {b.rating === "LOVE" && <Heart size={15} />}
                </div>
                <h3>{b.name}</h3>
                {b.roast && (
                  <p className="muted">
                    {b.roast}
                    {b.process ? ` · ${b.process}` : ""}
                  </p>
                )}
                <div className="taste-inline">
                  {b.notes.map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
              </div>
              <ChevronRight className="bean-chevron" size={18} />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          <BeanIcon size={38} strokeWidth={1.2} />
          <h2>{data.beans.length ? "No matching beans" : "No beans yet"}</h2>
          <p>
            {data.beans.length
              ? "Try another search or filter."
              : "Add your first coffee bean. A name and roaster are all you need."}
          </p>
          <Button onClick={add}>
            <Plus size={17} /> Add bean
          </Button>
        </div>
      )}
    </>
  );
}
