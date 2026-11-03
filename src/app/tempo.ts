// The app's state and actions in one place. Screens read signals and call actions; nothing else
// touches the engine or storage.
import { createContext, createEffect, createMemo, createSignal, on, onCleanup, untrack, useContext } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { createEngine } from "../audio/engine";
import type { VoiceId } from "../audio/voices";
import { positionState } from "../core/media";
import { addPreset, matches, removePreset, updatePreset, valuesOf, type Preset } from "../core/presets";
import { addTap, tapBpm } from "../core/tap";
import { MAX_BPM, MIN_BPM, clampBpm } from "../core/timeline";
import type { Click } from "../core/types";
import { artworkFor, cssVar } from "../platform/artwork";
import { settled } from "./settled";
import { capabilities } from "../platform/capabilities";
import { buzz, createWakeLock, setupMediaSession } from "../platform/device";
import { onLaunchTab } from "../platform/launch";
import { load, persistStorage, save } from "../platform/persist";
import { CHECK_SETTINGS, DEFAULT_PREFS, effectiveFeel, hydrate, toSettings, type Prefs, displayBpm } from "../state";

export type Tab = "unit" | "voice" | "presets";
export type SheetId = "random" | "gap" | "timer" | "countIn" | "preset" | "latency" | "meter" | null;

export const createTempo = () => {
  const [prefs, setPrefs] = createStore<Prefs>(structuredClone(DEFAULT_PREFS));
  const [loaded, setLoaded] = createSignal(false);
  const [playing, setPlaying] = createSignal(false);
  const [now, setNow] = createSignal<Click | null>(null);
  const [elapsed, setElapsed] = createSignal(0);
  const [seed, setSeed] = createSignal(1);
  const [flash, setFlash] = createSignal(false);
  const [tab, setTab] = createSignal<Tab>("unit");
  onLaunchTab(setTab); // home-screen shortcuts: /?tab=voice, /?tab=presets
  const [sheet, setSheet] = createSignal<SheetId>(null);
  const [editing, setEditing] = createSignal<string | null>(null); // preset id in the preset sheet
  const [toast, setToast] = createSignal<string | null>(null);
  // The headphone check: its own steady pulse, separate from the metronome's transport.
  const [checking, setChecking] = createSignal(false);
  let measuring = false; // no haptics while the user taps along: the taps must follow the sound alone
  let taps: number[] = [];

  const settings = createMemo(() => toSettings(prefs, seed()));
  const feel = createMemo(() => effectiveFeel({ ...prefs.feel }, capabilities));
  const activePreset = createMemo<Preset | undefined>(() => prefs.presets.find((p) => matches(p, prefs)));
  const shownBpm = () => displayBpm(prefs, playing() ? now() : null);
  const timerLeft = () => prefs.timer.minutes * 60 - elapsed();
  const timerEnd = () => (prefs.timer.on ? prefs.timer.minutes * 60 : null);

  const say = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1600);
  };

  // Lock-screen / notification controls. Declared before start/stop, which drive its carrier.
  const media = setupMediaSession({
    play: () => engine.running || void start(),
    pause: () => stop(),
    nudge: (d) => setBpm(prefs.bpm + d),
  });

  // ── engine ───────────────────────────────────────────────────────────
  const engine = createEngine({
    onClick: (c) => {
      setNow(c);
      if (measuring) return;
      // the one, when accented: with accents off nothing marks the bar
      const downbeat = c.kind === "accent" && !c.muted;
      if (downbeat && feel().buzz) buzz(c.countIn ? 10 : 20);
      if (downbeat && feel().flash) {
        setFlash(true);
        setTimeout(() => setFlash(false), 90);
      }
    },
  });

  // Everything up to the first await runs inside the play tap: the audio context and the
  // media-session carrier both need that gesture on iOS.
  const start = async () => {
    setSeed((Math.random() * 2 ** 31) | 0);
    setElapsed(0);
    endCheck();
    engine.setVoice(prefs.voice);
    engine.setLevel(prefs.level / 100);
    engine.setLatencyMs(prefs.latencyMs);
    const started = engine.start(settings());
    media.play();
    // Playing from the tap, not from when the audio context reports ready: on some phones resume()
    // settles late while clicks already sound, which left the display dark.
    setPlaying(true);
    try {
      await started;
    } catch {
      stop();
    }
  };
  const stop = () => {
    engine.stop();
    media.pause();
    setPlaying(false);
    setNow(null);
  };
  const toggle = () => (playing() ? stop() : void start());

  /** Play the headphone check (stopping the metronome). Call inside a tap: it may start the audio. */
  const startCheck = () => {
    if (playing()) stop();
    setNow(null);
    setChecking(true);
    engine.setEndAt(null);
    engine.start(CHECK_SETTINGS).catch(() => stopCheck());
  };
  /** Leave check mode, handing the engine back to the metronome's settings. */
  const endCheck = () => {
    if (!checking()) return;
    setChecking(false);
    measuring = false;
    setNow(null);
    engine.setLatencyMs(prefs.latencyMs); // drop any preview; the practice-timer end comes back via its effect
  };
  const stopCheck = () => {
    if (!checking()) return;
    engine.stop();
    endCheck();
  };

  createEffect(on(settings, (s) => playing() && engine.update(s), { defer: true }));
  createEffect(() => engine.setLevel(prefs.level / 100));
  createEffect(() => engine.setVoice(prefs.voice));
  createEffect(() => engine.setLatencyMs(prefs.latencyMs));
  createEffect(() => checking() || engine.setEndAt(timerEnd()));

  // ── device integrations ───────────────────────────────────────────────
  const wake = createWakeLock();
  createEffect(() => wake.set(playing() && feel().stayAwake));

  // Lock-screen metadata waits for the tempo to settle: drawing and encoding the artwork PNG is the
  // most expensive thing the app does, and nobody looks at the lock screen mid-turn.
  const lockMeta = settled(() => ({ bpm: shownBpm(), title: activePreset()?.name }), 350);
  createEffect(() => {
    const { bpm, title } = lockMeta.value();
    const art = loaded() ? artworkFor(String(bpm), { bg: cssVar("--color-display"), dot: cssVar("--color-accent") }) : null;
    media.metadata({ bpm, title, artwork: art });
  });
  // The OS extrapolates the position itself; only transitions and timer changes need reporting.
  createEffect(() => {
    const timer = prefs.timer.on ? prefs.timer.minutes * 60 : null;
    media.state(playing(), positionState(timer, untrack(elapsed)));
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

  // ── persistence ────────────────────────────────────
  void (async () => {
    setPrefs(reconcile(hydrate(await load<Partial<Prefs>>("prefs", {}))));
    setLoaded(true);
    void persistStorage();
  })();
  // Save once a change has settled, and right away when the app goes to the background.
  const saved = settled(() => JSON.stringify(prefs), 400);
  createEffect(() => {
    const json = saved.value();
    if (loaded()) void save("prefs", JSON.parse(json) as Prefs);
  });
  const flushAll = () => document.visibilityState === "hidden" && (saved.flush(), lockMeta.flush());
  document.addEventListener("visibilitychange", flushAll);
  onCleanup(() => document.removeEventListener("visibilitychange", flushAll));

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
  // Keyboard (desktop, and Bluetooth page-turner pedals, which send arrows): Space plays/stops,
  // up/down nudge the tempo (Shift: by 10), T taps. A focused knob or text field keeps its keys.
  const onKey = (e: KeyboardEvent) => {
    const el = e.target instanceof Element ? e.target : null;
    if (sheet() || e.metaKey || e.ctrlKey || e.altKey || el?.closest("input, textarea, [role=slider]")) return;
    const key = e.key === " " || e.code === "Space" ? "space" : e.key.toLowerCase();
    if (key === "space") {
      e.preventDefault();
      if (!e.repeat) toggle();
    } else if (key === "arrowup" || key === "arrowdown") {
      e.preventDefault();
      setBpm(prefs.bpm + (key === "arrowup" ? 1 : -1) * (e.shiftKey ? 10 : 1));
    } else if (key === "t" && !e.repeat) {
      tap();
    }
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return {
    prefs, setPrefs, playing, now, flash, feel, elapsed, timerLeft, shownBpm,
    tab, setTab, sheet, setSheet, editing, setEditing, toast, say,
    activePreset, applyPreset, savePreset, editPreset, deletePreset,
    toggle, start, stop, tap, setBpm,
    preview: (v: VoiceId) => void engine.preview(v),
    check: {
      running: checking,
      start: startCheck,
      stop: stopCheck,
      /** While true, downbeats don't buzz: taps must follow the sound alone. */
      setMeasuring: (on: boolean) => (measuring = on),
      /** Try a delay without saving it; null goes back to the saved one. */
      preview: (ms: number | null) => engine.setLatencyMs(ms ?? prefs.latencyMs),
      /** A tap's place on the check's timeline (ms), after the latency the browser reports. */
      tapTime: (timeStamp: number) => {
        const s = engine.tapTime(timeStamp);
        return s === null ? null : s * 1000;
      },
      reportedMs: () => engine.reportedLatencyMs(),
    },
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
