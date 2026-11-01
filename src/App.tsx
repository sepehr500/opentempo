import { For, Match, Show, Switch } from "solid-js";
import { TempoProvider, createTempo, useTempo, type Tab } from "./app/tempo";
import { Presets } from "./screens/Presets";
import { Sheets } from "./screens/Sheets";
import { Unit } from "./screens/Unit";
import { Voice } from "./screens/Voice";
import { canInstall, install, isInstalled } from "./platform/install";
import { shareApp, shareData, shareToast } from "./platform/share";
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
  return (
    <main class={`screen ${t.tab()}`}>
      <header class="top">
        <h1 class="brand">
          <Wordmark />
        </h1>
        {/* before installing: install; once installed: share the app */}
        <Show when={canInstall()} fallback={<Show when={isInstalled()}><ShareKey /></Show>}>
          <button class="install-btn" onClick={() => void install()}>
            install
          </button>
        </Show>
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
