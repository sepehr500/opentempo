import { For, Match, Show, Switch } from "solid-js";
import { TempoProvider, createTempo, useTempo, type Tab } from "./app/tempo";
import { Sets } from "./screens/Sets";
import { Sheets } from "./screens/Sheets";
import { Unit } from "./screens/Unit";
import { Voice } from "./screens/Voice";
import * as Icon from "./ui/icons";

const TABS: readonly Tab[] = ["unit", "voice", "sets"];

const Shell = () => {
  const t = useTempo();
  return (
    <main class={`screen ${t.tab()}`}>
      <header class="top">
        <h1>{t.tab() === "unit" ? "tempo" : t.tab()}</h1>
        <button class="icon-btn" aria-label="menu" aria-haspopup="dialog" onClick={() => t.setSheet("menu")}>
          <Icon.More />
        </button>
      </header>

      <Switch>
        <Match when={t.tab() === "unit"}>
          <Unit />
        </Match>
        <Match when={t.tab() === "voice"}>
          <Voice />
        </Match>
        <Match when={t.tab() === "sets"}>
          <Sets />
        </Match>
      </Switch>

      <nav class="tabs" aria-label="screens">
        <For each={TABS}>
          {(id) => (
            <button class="tab" classList={{ active: t.tab() === id }} aria-current={t.tab() === id ? "page" : undefined} onClick={() => t.setTab(id)}>
              {id}
            </button>
          )}
        </For>
      </nav>

      <Sheets />
      <Show when={t.toast()}>
        <div class="toast" role="status">
          {t.toast()}
        </div>
      </Show>
    </main>
  );
};

export const App = () => (
  <TempoProvider value={createTempo()}>
    <Shell />
  </TempoProvider>
);
