// The app's state and actions in one place. Screens read signals and call actions; nothing else
// touches the engine or storage.
import { createContext, createEffect, createMemo, createSignal, on, onCleanup, useContext } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { createEngine } from "../audio/engine";
import type { VoiceId } from "../audio/voices";
import { addPreset, matches, removePreset, updatePreset, valuesOf, type Preset } from "../core/presets";
import { addTap, tapBpm } from "../core/tap";
import { MAX_BPM, MIN_BPM, clampBpm } from "../core/timeline";
import type { Click } from "../core/types";
import { artworkFor, cssVar } from "../platform/artwork";
import { capabilities } from "../platform/capabilities";
import { buzz, createWakeLock, setupMediaSession } from "../platform/device";
import { load, persistStorage, save } from "../platform/persist";
import { DEFAULT_PREFS, effectiveFeel, hydrate, toSettings, type Prefs } from "../state";

export type Tab = "unit" | "voice" | "presets";
export type SheetId = "random" | "gap" | "timer" | "countIn" | "menu" | "preset" | null;

export const createTempo = () => {
  const [prefs, setPrefs] = createStore<Prefs>(structuredClone(DEFAULT_PREFS));
  const [loaded, setLoaded] = createSignal(false);
  const [playing, setPlaying] = createSignal(false);
  const [now, setNow] = createSignal<Click | null>(null);
  const [elapsed, setElapsed] = createSignal(0);
  const [seed, setSeed] = createSignal(1);
  const [flash, setFlash] = createSignal(false);
  const [tab, setTab] = createSignal<Tab>("unit");
  const [sheet, setSheet] = createSignal<SheetId>(null);
  const [editing, setEditing] = createSignal<string | null>(null); // preset id in the preset sheet
  const [toast, setToast] = createSignal<string | null>(null);
  let taps: number[] = [];

  const settings = createMemo(() => toSettings(prefs, seed()));
  const feel = createMemo(() => effectiveFeel({ ...prefs.feel }, capabilities));
  const activePreset = createMemo<Preset | undefined>(() => prefs.presets.find((p) => matches(p, prefs)));
  const shownBpm = () => (playing() && now() && !now()!.countIn ? now()!.bpm : prefs.bpm);
  const timerLeft = () => prefs.timer.minutes * 60 - elapsed();

  const say = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1600);
  };

  // ── engine ───────────────────────────────────────────────────────────
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

  const start = async () => {
    setSeed((Math.random() * 2 ** 31) | 0);
    setElapsed(0);
    engine.setVoice(prefs.voice);
    engine.setLevel(prefs.level / 100);
    engine.setLatencyMs(prefs.latencyMs);
    await engine.start(settings());
    setPlaying(true);
  };
  const stop = () => {
    engine.stop();
    setPlaying(false);
    setNow(null);
  };
  const toggle = () => (playing() ? stop() : void start());

  createEffect(on(settings, (s) => playing() && engine.update(s), { defer: true }));
  createEffect(() => engine.setLevel(prefs.level / 100));
  createEffect(() => engine.setVoice(prefs.voice));
  createEffect(() => engine.setLatencyMs(prefs.latencyMs));

  // ── device integrations ───────────────────────────────────────────────
  const wake = createWakeLock();
  createEffect(() => wake.set(playing() && feel().stayAwake));

  const media = setupMediaSession({
    play: () => void start(),
    pause: stop,
    nudge: (d) => setBpm(prefs.bpm + d),
  });
  createEffect(() => {
    const bpm = shownBpm();
    const art = loaded() ? artworkFor(String(bpm), { bg: cssVar("--color-display"), dot: cssVar("--color-accent") }) : null;
    media.update({ bpm, playing: playing(), title: activePreset()?.name, artwork: art });
  });

  const timerId = setInterval(() => {
    if (!playing()) return;
    setElapsed(engine.elapsed());
    if (prefs.timer.on && timerLeft() <= 0) {
      if (prefs.timer.atEnd === "buzz" && capabilities.vibration) buzz(400);
      stop();
    }
  }, 250);
  onCleanup(() => clearInterval(timerId));

  // ── persistence + shared-set links ────────────────────────────────────
  void (async () => {
    setPrefs(reconcile(hydrate(await load<Partial<Prefs>>("prefs", {}))));
    setLoaded(true);
    void persistStorage();
  })();
  createEffect(() => {
    const snapshot = JSON.parse(JSON.stringify(prefs)) as Prefs;
    if (loaded()) void save("prefs", snapshot);
  });

  // ── actions ───────────────────────────────────────────────────────────
  const setBpm = (bpm: number) => setPrefs("bpm", clampBpm(bpm));

  const tap = () => {
    taps = addTap(taps, performance.now());
    const bpm = tapBpm(taps);
    if (bpm) setBpm(bpm);
  };

  const applyPreset = (p: Preset) =>
    setPrefs(
      produce((x) => {
        Object.assign(x, valuesOf(p));
        x.voice = p.voice as VoiceId;
      }),
    );

  const savePreset = (): Preset => {
    const list = addPreset(prefs.presets, prefs);
    setPrefs("presets", list);
    return list[list.length - 1];
  };

  const editPreset = (id: string, patch: Partial<Omit<Preset, "id">>) => setPrefs("presets", (l) => updatePreset(l, id, patch));
  const deletePreset = (id: string) => setPrefs("presets", (l) => removePreset(l, id));

  // Space bar plays/stops (keyboards, Bluetooth pedals that send space).
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== "Space" || e.target instanceof HTMLInputElement || sheet()) return;
    e.preventDefault();
    toggle();
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return {
    prefs, setPrefs, playing, now, flash, feel, elapsed, timerLeft, shownBpm,
    tab, setTab, sheet, setSheet, editing, setEditing, toast, say,
    activePreset, applyPreset, savePreset, editPreset, deletePreset,
    toggle, start, stop, tap, setBpm,
    preview: (v: VoiceId) => void engine.preview(v),
    limits: { MIN_BPM, MAX_BPM },
  };
};

export type Tempo = ReturnType<typeof createTempo>;
const Ctx = createContext<Tempo>();
export const TempoProvider = Ctx.Provider;
export const useTempo = (): Tempo => {
  const t = useContext(Ctx);
  if (!t) throw new Error("useTempo outside TempoProvider");
  return t;
};
