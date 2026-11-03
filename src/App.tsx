import { For, Match, Show, Switch } from "solid-js";
import { TempoProvider, createTempo, useTempo, type Tab } from "./app/tempo";
import { Presets } from "./screens/Presets";
import { Sheets } from "./screens/Sheets";
import { Unit } from "./screens/Unit";
import { Voice } from "./screens/Voice";
import { canInstall, install, isInstalled } from "./platform/install";
import { shareApp, shareData, shareToast } from "./platform/share";
import { headerSlot } from "./platform/header";
import { applyUpdate, updateReady } from "./platform/update";
import * as Icon from "./ui/icons";
import { Wordmark } from "./ui/Wordmark";

const TABS: readonly Tab[] = ["unit", "voice", "presets"];

const ShareKey = () => {
  const t = useTempo();
  const share = async () => {
    const data = shareData(location.origin);
    const msg = shareToast(await shareApp(navigator, data), data.url!);
    if (msg) t.say(msg);
  };
  return (
    <button class="share-btn" aria-label="share tempo" onClick={() => void share()}>
      <Icon.Share />
    </button>
  );
};

const Shell = () => {
  const t = useTempo();
  const slot = () => headerSlot({ update: updateReady(), canInstall: canInstall(), installed: isInstalled() });
  return (
    <main class={`screen ${t.tab()}`}>
      <header class="top">
        <h1 class="brand">
          <Wordmark />
        </h1>
        {/* one slot: update when a new version is ready, else install, else (installed) share */}
        <Switch>
          <Match when={slot() === "update"}>
            <button
              class="install-btn"
              onClick={() => {
                if (t.playing()) t.toggle(); // the reload would cut the click off mid-bar anyway
                void applyUpdate();
              }}
            >
              update
            </button>
          </Match>
          <Match when={slot() === "install"}>
            <button class="install-btn" onClick={() => void install()}>
              install
            </button>
          </Match>
          <Match when={slot() === "share"}>
            <ShareKey />
          </Match>
        </Switch>
      </header>

      <Switch>
        <Match when={t.tab() === "unit"}>
          <Unit />
        </Match>
        <Match when={t.tab() === "voice"}>
          <Voice />
        </Match>
        <Match when={t.tab() === "presets"}>
          <Presets />
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
