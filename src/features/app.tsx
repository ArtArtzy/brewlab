"use client";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bean as BeanIcon,
  House,
  SlidersHorizontal,
  FlaskConical,
  Check,
} from "lucide-react";
import { Bean, Data, Drink, drinkNames } from "@/lib/domain/types";
import { Mark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BeanEditor } from "./beans/bean-editor";
import { BeanList } from "./beans/bean-list";
import { BeanDetail } from "./beans/bean-detail";
import { PurchaseEditor } from "./beans/purchase-editor";
import { RecipeEditor } from "./recipes/recipe-editor";
import { PinEditor } from "./recipes/pin-editor";
import { BrewEditor } from "./brews/brew-editor";
import { EquipmentEditor } from "./settings/equipment-editor";
import { Settings } from "./settings/settings";
import { Home } from "./home";
import { Screen, Modal } from "./types";
import { RecipeScreen } from "./recipes/recipe-screen";
const emptyData: Data = {
  beans: [],
  recipe_versions: [],
  recipe_families: [],
  recipe_pins: [],
  brew_logs: [],
  equipment: [],
  choices: [],
  purchases: [],
};
const navigation = [
  { key: "home", label: "Home", Icon: House },
  { key: "beans", label: "Beans", Icon: BeanIcon },
  { key: "settings", label: "Settings", Icon: SlidersHorizontal },
] as const;
export function BrewLab({
  unlocked,
  configured,
}: {
  unlocked: boolean;
  configured: boolean;
}) {
  const [ready, setReady] = useState(unlocked),
    [data, setData] = useState<Data>(emptyData),
    [screen, setScreen] = useState<Screen>({ type: "home" }),
    [modal, setModal] = useState<Modal>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(unlocked),
    [pin, setPin] = useState(""),
    [busy, setBusy] = useState(false),
    [customDose, setCustomDose] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/data", { cache: "no-store" });
    const result = await response.json();
    if (response.status === 401) {
      setReady(false);
      setModal(null);
      setData(emptyData);
      setLoading(false);
      return;
    }
    if (!response.ok) throw new Error(result.error);
    setData(result);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      load().catch((e) => {
        setError(e.message);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [ready, load]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  const mutate = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const value = await res.json();
    if (res.status === 401) {
      setReady(false);
      setModal(null);
      setData(emptyData);
    }
    if (!res.ok) throw new Error(value.error);
    await load();
    setNotice("Saved to your notebook");
  };
  const save = async (action: string, value: unknown, id?: string) => {
    await mutate({
      action,
      value,
      id,
      ...(action === "recipe" ? { beanId: id } : {}),
    });
  };
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete action");
    }
  };
  const nav = (s: Screen) => {
    setScreen(s);
    setError("");
  };
  const bean =
    "beanId" in screen
      ? data.beans.find((b) => b.id === screen.beanId)
      : undefined;
  const openRecipe = (
    b: Bean,
    drink: Drink,
    dose: number,
    versionId?: string,
  ) => nav({ type: "recipe", beanId: b.id, drink, dose, versionId });
  const activeTab = ["choose", "dose", "recipe"].includes(screen.type)
    ? "home"
    : screen.type === "detail"
      ? "beans"
      : screen.type;
  const back = () => {
    if (screen.type === "recipe")
      nav(
        screen.drink === "AMERICANO"
          ? { type: "dose", beanId: screen.beanId, drink: screen.drink }
          : { type: "choose", drink: screen.drink },
      );
    else if (screen.type === "dose")
      nav({ type: "choose", drink: screen.drink });
    else if (screen.type === "detail") nav({ type: "beans" });
    else nav({ type: "home" });
  };
  if (!ready)
    return (
      <div className="lock-page">
        <div className="lock-brand">
          <Mark size={44} />
          <span>
            brew lab<span className="brand-dot">.</span>
          </span>
        </div>
        <main className="lock-card">
          <div className="eyebrow">YOUR PERSONAL COFFEE NOTEBOOK</div>
          <h1>
            A good cup
            <br />
            starts here.
          </h1>
          <p className="muted">
            Unlock your recipes. Make yourself something good.
          </p>
          {!configured && (
            <div className="setup-note">
              Your notebook is ready to connect. Add the server environment
              variables from .env.example, then apply the migration and seed
              data.
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const res = await fetch("/api/unlock", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pin }),
                });
                const v = await res.json();
                if (!res.ok) throw new Error(v.error);
                setReady(true);
                setLoading(true);
                setPin("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Unable to unlock");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Your 4-digit PIN
              <input
                className="pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                autoComplete="current-password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • •"
              />
            </label>
            <Button disabled={busy} className="full">
              {busy ? "Unlocking…" : "Unlock Brew Lab"}
              <ArrowRight size={18} />
            </Button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
          <p className="lock-foot">
            <FlaskConical size={14} /> A small ritual. A better cup.
          </p>
        </main>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => nav({ type: "home" })}>
          <Mark />
          <span>
            brew lab<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="nav-label">YOUR NOTEBOOK</div>
        <nav>
          {navigation.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`nav-item ${activeTab === key ? "active" : ""}`}
              onClick={() => nav({ type: key })}
            >
              <Icon size={19} />
              {label}
              {activeTab === key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Mark size={20} />
          <p>
            Small changes.
            <br />
            Better coffee.
          </p>
          <span>BREW LAB / V1</span>
        </div>
      </aside>
      <header className="mobile-header">
        <button className="brand" onClick={() => nav({ type: "home" })}>
          <Mark size={26} />
          <span>brew lab.</span>
        </button>
        <span className="eyebrow">PERSONAL NOTEBOOK</span>
      </header>
      <main className={`main ${screen.type === "home" ? "home-main" : ""}`}>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        {loading ? (
          <div className="empty">
            <Mark size={44} />
            <p>Opening your notebook…</p>
          </div>
        ) : (
          <>
            {screen.type === "home" && (
              <Home choose={(drink) => nav({ type: "choose", drink })} />
            )}
            {(screen.type === "beans" || screen.type === "choose") && (
              <>
                {screen.type === "choose" && (
                  <button className="back" onClick={back}>
                    <ArrowLeft size={16} /> {drinkNames[screen.drink]}
                  </button>
                )}
                <BeanList
                  data={data}
                  drink={screen.type === "choose" ? screen.drink : undefined}
                  add={() => setModal({ type: "bean" })}
                  select={(b) =>
                    screen.type === "beans"
                      ? nav({ type: "detail", beanId: b.id })
                      : screen.drink === "AMERICANO"
                        ? nav({
                            type: "dose",
                            beanId: b.id,
                            drink: screen.drink,
                          })
                        : openRecipe(b, screen.drink, 18)
                  }
                />
              </>
            )}
            {screen.type === "dose" && bean && (
              <>
                <button className="back" onClick={back}>
                  <ArrowLeft size={16} /> Choose bean
                </button>
                <div className="eyebrow">STEP 02 / YOUR DOSE</div>
                <h1>How much coffee?</h1>
                <p className="muted">
                  {bean.name} · {bean.roaster}
                </p>
                <div className="dose-grid">
                  {[15, 20].map((d) => (
                    <button
                      className="dose-card"
                      key={d}
                      onClick={() => openRecipe(bean, "AMERICANO", d)}
                    >
                      <span>YOUR RECIPE</span>
                      <strong>
                        {d}
                        <small>g</small>
                      </strong>
                      <ArrowRight size={22} />
                    </button>
                  ))}
                </div>
                <details className="custom-dose">
                  <summary>Custom dose</summary>
                  <p className="muted">
                    Start from your nearest 15g or 20g recipe. Water scales;
                    everything else stays familiar.
                  </p>
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = Number(customDose);
                      if (n > 0 && n <= 100) openRecipe(bean, "AMERICANO", n);
                    }}
                  >
                    <label>
                      Coffee · g
                      <input
                        required
                        type="number"
                        min="1"
                        max="100"
                        step="0.1"
                        value={customDose}
                        onChange={(e) => setCustomDose(e.target.value)}
                        placeholder="16.3"
                      />
                    </label>
                    <Button>
                      See recipe <ArrowRight size={17} />
                    </Button>
                  </form>
                </details>
              </>
            )}
            {screen.type === "recipe" && bean && (
              <RecipeScreen
                screen={screen}
                bean={bean}
                data={data}
                back={back}
                setModal={setModal}
                setScreen={setScreen}
                run={run}
                save={save}
              />
            )}
            {screen.type === "detail" && bean && (
              <>
                <button className="back" onClick={back}>
                  <ArrowLeft size={16} /> Your beans
                </button>
                <BeanDetail
                  bean={bean}
                  data={data}
                  edit={() => setModal({ type: "bean", bean })}
                  purchase={() =>
                    setModal({ type: "purchase", beanId: bean.id })
                  }
                  recipe={(d, dose) => openRecipe(bean, d, dose)}
                  openPin={(v) =>
                    openRecipe(bean, v.snapshot.drink, v.snapshot.dose, v.id)
                  }
                  openBrew={(b) =>
                    setModal({
                      type: "brew",
                      beanId: bean.id,
                      recipe: b.snapshot,
                      versionId: b.source_version_id,
                      brew: b,
                    })
                  }
                  archive={() =>
                    run(() =>
                      save(
                        "bean",
                        {
                          ...bean,
                          status:
                            bean.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                        },
                        bean.id,
                      ),
                    )
                  }
                  remove={() => {
                    if (
                      confirm(
                        `Delete ${bean.name} and all its recipes, brews and purchases? This cannot be undone.`,
                      )
                    )
                      run(async () => {
                        await mutate({ action: "deleteBean", id: bean.id });
                        nav({ type: "beans" });
                      });
                  }}
                  deleteBrew={(b) => {
                    if (
                      confirm(
                        "Delete this brew log? Latest and pins stay intact.",
                      )
                    )
                      run(() => mutate({ action: "deleteBrew", id: b.id }));
                  }}
                />
              </>
            )}
            {screen.type === "settings" && (
              <Settings
                data={data}
                edit={(kind, item) =>
                  setModal({ type: "equipment", kind, item })
                }
                remove={(e) => {
                  if (
                    confirm(
                      `Delete ${e.name}? Historical snapshots retain its name and settings.`,
                    )
                  )
                    run(() => mutate({ action: "deleteEquipment", id: e.id }));
                }}
                toggle={(e) =>
                  run(() =>
                    save("equipment", { ...e, available: !e.available }, e.id),
                  )
                }
                logout={() =>
                  run(async () => {
                    const res = await fetch("/api/logout", { method: "POST" });
                    if (!res.ok) throw new Error("Unable to log out");
                    setData(emptyData);
                    setReady(false);
                    nav({ type: "home" });
                  })
                }
              />
            )}
          </>
        )}
      </main>
      <nav className="bottom-nav">
        {navigation.map(({ key, label, Icon }) => (
          <button
            className={activeTab === key ? "active" : ""}
            key={key}
            onClick={() => nav({ type: key })}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      {modal?.type === "bean" && (
        <BeanEditor
          bean={modal.bean}
          data={data}
          save={save}
          close={() => setModal(null)}
        />
      )}
      {modal?.type === "editor" && (
        <Dialog
          title="Your recipe"
          description="Saving creates a new Latest and preserves every previous version."
          onClose={() => {
            if (confirm("Discard unsaved recipe changes?")) setModal(null);
          }}
        >
          <RecipeEditor
            initial={modal.recipe}
            data={data}
            onSave={async (r) => {
              await save("recipe", r, modal.beanId);
              setModal(null);
              if (screen.type === "recipe")
                setScreen({ ...screen, versionId: undefined });
            }}
            onCancel={() => setModal(null)}
          />
        </Dialog>
      )}
      {modal?.type === "brew" && (
        <BrewEditor
          {...modal}
          data={data}
          save={save}
          close={() => setModal(null)}
        />
      )}
      {modal?.type === "equipment" && (
        <EquipmentEditor
          kind={modal.kind}
          item={modal.item}
          save={save}
          close={() => setModal(null)}
        />
      )}
      {modal?.type === "purchase" && (
        <PurchaseEditor
          beanId={modal.beanId}
          save={save}
          close={() => setModal(null)}
        />
      )}
      {modal?.type === "pin" && (
        <PinEditor
          version={modal.version}
          data={data}
          mutate={mutate}
          close={() => setModal(null)}
        />
      )}
    </div>
  );
}
