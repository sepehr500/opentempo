import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { createEngine } from "./audio/engine";
import { VOICES, type VoiceId } from "./audio/voices";
import { markingOf } from "./core/italian";
import { addTap, tapBpm } from "./core/tap";
import { MAX_BPM, MIN_BPM } from "./core/timeline";
import type { Click, Subdivision } from "./core/types";
import { capabilities } from "./platform/capabilities";
import { buzz, createWakeLock, setupMediaSession } from "./platform/device";
import { load, persistStorage, save } from "./platform/persist";
import { DEFAULT_PREFS, SPLIT_GLYPH, effectiveFeel, formatClock, hydrate, toSettings, type Prefs } from "./state";
import { DotMatrix } from "./ui/DotMatrix";
import { Knob } from "./ui/Knob";
import * as Icon from "./ui/icons";

const VOICE_ORDER = Object.keys(VOICES) as VoiceId[];

export const App = () => {
  const [prefs, setPrefs] = createStore<Prefs>(structuredClone(DEFAULT_PREFS));
  const [playing, setPlaying] = createSignal(false);
  const [now, setNow] = createSignal<Click | null>(null);
  const [elapsed, setElapsed] = createSignal(0);
  const [seed, setSeed] = createSignal(1);
  let taps: number[] = [];

  const [loaded, setLoaded] = createSignal(false);
  const [flash, setFlash] = createSignal(false);
  const settings = createMemo(() => toSettings(prefs, seed()));
  const feel = createMemo(() => effectiveFeel({ ...prefs.feel }, capabilities));
  const shownBpm = () => (playing() && now() ? now()!.bpm : prefs.bpm);
  const timerLeft = () => prefs.timer.minutes * 60 - elapsed();

  const engine = createEngine({
    onClick: (c) => {
      setNow(c);
      const downbeat = c.beat === 0 && c.sub === 0 && !c.muted;
      if (downbeat && feel().buzz) buzz(c.countIn ? 10 : 20);
      if (downbeat && feel().flash) {
        setFlash(true);
        setTimeout(() => setFlash(false), 90);
      }
    },
  });
  const wake = createWakeLock();
  const media = setupMediaSession({
    play: () => void start(),
    pause: () => stop(),
    nudge: (d) => setPrefs("bpm", (b) => Math.min(MAX_BPM, Math.max(MIN_BPM, b + d))),
  });

  const start = async () => {
    setSeed((Math.random() * 2 ** 31) | 0);
    setElapsed(0);
    engine.setVoice(prefs.voice);
    await engine.start(settings());
    engine.setLevel(prefs.level / 100);
    setPlaying(true);
  };
  const stop = () => {
    engine.stop();
    setPlaying(false);
    setNow(null);
  };
  const toggle = () => (playing() ? stop() : void start());

  // Settings → engine (re-plans from the next click without a hiccup).
  createEffect(on(settings, (s) => playing() && engine.update(s), { defer: true }));
  createEffect(() => engine.setLevel(prefs.level / 100));
  createEffect(() => engine.setVoice(prefs.voice));
  createEffect(() => wake.set(playing() && feel().stayAwake));
  createEffect(() => media.update({ bpm: shownBpm(), playing: playing() }));

  // Practice timer, driven by the audio clock.
  const timerId = setInterval(() => {
    if (!playing()) return;
    setElapsed(engine.elapsed());
    if (prefs.timer.on && timerLeft() <= 0) {
      if (prefs.timer.atEnd === "buzz") buzz(400);
      stop();
    }
  }, 250);
  onCleanup(() => clearInterval(timerId));

  onMount(async () => {
    setPrefs(reconcile(hydrate(await load<Partial<Prefs>>("prefs", {}))));
    setLoaded(true);
    void persistStorage();
  });
  // Deep read via JSON tracks every field; only save after the stored prefs are loaded.
  createEffect(() => {
    const snapshot = JSON.parse(JSON.stringify(prefs)) as Prefs;
    if (loaded()) void save("prefs", snapshot);
  });

  const onKey = (e: KeyboardEvent) => {
    if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      toggle();
    }
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => window.removeEventListener("keydown", onKey));

  const tap = () => {
    taps = addTap(taps, performance.now());
    const bpm = tapBpm(taps);
    if (bpm) setPrefs("bpm", bpm);
  };

  const beatState = (i: number) => {
    const c = now();
    if (!playing() || !c) return "off";
    if (c.muted) return i <= c.beat ? "dim" : "off";
    return i === c.beat ? "on" : i < c.beat ? "dim" : "off";
  };

  return (
    <main class="unit">
      <header class="top">
        <h1>tempo</h1>
        <button class="icon-btn" aria-label="menu">
          <Icon.More />
        </button>
      </header>

      <section class="display" classList={{ flash: flash() }} aria-live="off">
        <div class="display-top">
          <span>{prefs.beatsPerBar}/4</span>
          <Show when={playing() && now()}>
            <span class="display-bar">
              <Show when={now()!.muted}>
                <Icon.Muted />
              </Show>
              {now()!.countIn ? "count" : `bar ${now()!.bar + 1}`}
            </span>
          </Show>
        </div>
        <div class="display-main">
          <DotMatrix text={String(shownBpm())} />
          <div class="display-side">
            <span class="display-unit">bpm</span>
            <span class="display-sub">
              <Show when={prefs.timer.on} fallback={markingOf(shownBpm())}>
                <Icon.Timer size={11} /> {formatClock(playing() ? timerLeft() : prefs.timer.minutes * 60)}
              </Show>
            </span>
          </div>
        </div>
        <div class="beats">
          <For each={Array.from({ length: prefs.beatsPerBar }, (_, i) => i)}>
            {(i) => (
              <div class="beat">
                <div class={`beat-bar ${beatState(i)}`} />
                <span classList={{ current: beatState(i) === "on" }}>{i + 1}</span>
              </div>
            )}
          </For>
        </div>
      </section>

      <section class="knobs">
        <Knob label="tempo" color="blue" value={prefs.bpm} min={MIN_BPM} max={MAX_BPM} sensitivity={3} onChange={(v) => setPrefs("bpm", v)} display={shownBpm()} />
        <Knob label="beats" color="green" value={prefs.beatsPerBar} min={1} max={12} sensitivity={14} onChange={(v) => setPrefs("beatsPerBar", v)} />
        <Knob label="split" color="cream" value={prefs.subdivision} min={1} max={4} sensitivity={20} onChange={(v) => setPrefs("subdivision", v as Subdivision)} display={SPLIT_GLYPH[prefs.subdivision]} />
        <Knob label="level" color="accent" value={prefs.level} min={0} max={100} step={5} sensitivity={4} onChange={(v) => setPrefs("level", v)} />
      </section>

      <section class="grid fn-row">
        <FnKey label="random" on={prefs.random.on} value={`${prefs.random.min}–${prefs.random.max}`} icon={<Icon.Dice />} onClick={() => setPrefs("random", "on", (v) => !v)} />
        <FnKey label="gap" on={prefs.gap.on} value={`${prefs.gap.play} : ${prefs.gap.mute}`} icon={<Icon.Gap />} onClick={() => setPrefs("gap", "on", (v) => !v)} />
        <FnKey label="timer" on={prefs.timer.on} value={formatClock(prefs.timer.minutes * 60)} icon={<Icon.Timer />} onClick={() => setPrefs("timer", "on", (v) => !v)} />
        <FnKey label="count-in" on={prefs.countIn.on} value={`${prefs.countIn.bars} bar`} icon={<Icon.CountIn />} onClick={() => setPrefs("countIn", "on", (v) => !v)} />
      </section>

      <section class="grid transport">
        <button class="key tall" onClick={() => setPrefs("voice", (v) => VOICE_ORDER[(VOICE_ORDER.indexOf(v) + 1) % VOICE_ORDER.length])}>
          <Icon.Wave />
          <span>{prefs.voice}</span>
        </button>
        <button class="key tall slate" onPointerDown={tap}>
          <Icon.Tap />
          <span>tap</span>
        </button>
        <button class={`key tall span-2 ${playing() ? "slate" : "accent"}`} onClick={toggle} aria-pressed={playing()}>
          <Show when={playing()} fallback={<Icon.Play />}>
            <Icon.Stop />
          </Show>
          <span class="big">{playing() ? "stop" : "play"}</span>
        </button>
      </section>

      <nav class="tabs">
        <button class="tab active">unit</button>
        <button class="tab" disabled>voice</button>
        <button class="tab" disabled>sets</button>
      </nav>
    </main>
  );
};

const FnKey = (p: { label: string; on: boolean; value: string; icon: any; onClick: () => void }) => (
  <button class={`key fn ${p.on ? "accent" : ""}`} aria-pressed={p.on} onClick={p.onClick}>
    <span class="fn-top">
      {p.icon}
      <Show when={p.on}>
        <span class="fn-value">{p.value}</span>
      </Show>
    </span>
    <span>{p.label}</span>
  </button>
);
