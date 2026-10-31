// The app's state and actions in one place. Screens read signals and call actions; nothing else
// touches the engine or storage.
import { batch, createContext, createEffect, createMemo, createSignal, on, onCleanup, useContext } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import { createEngine } from "../audio/engine";
import type { VoiceId } from "../audio/voices";
import { addSong, decodeSet, encodeSet, isSongEnd, newId, step, type SetList, type Song } from "../core/sets";
import { addTap, tapBpm } from "../core/tap";
import { MAX_BPM, MIN_BPM, clampBpm } from "../core/timeline";
import type { Click } from "../core/types";
import { artworkFor, cssVar } from "../platform/artwork";
import { capabilities } from "../platform/capabilities";
import { buzz, createWakeLock, setupMediaSession } from "../platform/device";
import { shareLink } from "../platform/install";
import { load, persistStorage, save } from "../platform/persist";
import { DEFAULT_PREFS, effectiveFeel, hydrate, toSettings, type Prefs } from "../state";

export type Tab = "unit" | "voice" | "sets";
export type SheetId = "random" | "gap" | "timer" | "countIn" | "menu" | "song" | null;

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
  const [editing, setEditing] = createSignal<string | null>(null); // song id in the song sheet
  const [toast, setToast] = createSignal<string | null>(null);
  /** Bar index (in engine numbering) where the current song started; for per-song bar counts. */
  const [songStartBar, setSongStartBar] = createSignal(0);
  let taps: number[] = [];

  const settings = createMemo(() => toSettings(prefs, seed()));
  const feel = createMemo(() => effectiveFeel({ ...prefs.feel }, capabilities));
  const activeSet = createMemo<SetList>(() => prefs.sets.find((s) => s.id === prefs.activeSet) ?? prefs.sets[0]);
  const song = createMemo<Song | undefined>(() => activeSet().songs[prefs.activeSong]);
  const nextSong = createMemo<Song | undefined>(() => activeSet().songs[prefs.activeSong + 1]);
  const shownBpm = () => (playing() && now() && !now()!.countIn ? now()!.bpm : prefs.bpm);
  const songBar = () => (now() && !now()!.countIn ? now()!.bar - songStartBar() : -1);
  const timerLeft = () => prefs.timer.minutes * 60 - elapsed();

  const say = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1600);
  };

  // ── engine ───────────────────────────────────────────────────────────
  const loadSong = (index: number) => {
    const s = activeSet().songs[index];
    if (!s) return;
    batch(() => {
      setPrefs(
        produce((p) => {
          p.activeSong = index;
          p.bpm = s.bpm;
          p.beatsPerBar = s.beatsPerBar;
          p.subdivision = s.subdivision;
          p.voice = s.voice as VoiceId;
        }),
      );
      const c = now();
      // The next bar is bar 0 of the new song.
      setSongStartBar(c && !c.countIn ? c.bar + 1 : 0);
    });
  };

  const engine = createEngine({
    onClick: (c) => {
      setNow(c);
      const downbeat = c.beat === 0 && c.sub === 0 && !c.muted;
      if (downbeat && feel().buzz) buzz(c.countIn ? 10 : 20);
      if (downbeat && feel().flash) {
        setFlash(true);
        setTimeout(() => setFlash(false), 90);
      }
      // Auto-next: on the last beat of the song's last bar, load the next song so it starts on the next bar.
      if (!c.countIn && c.sub === 0 && prefs.autoNext && isSongEnd(song(), c.bar - songStartBar(), c.beat, prefs.beatsPerBar)) {
        const n = step(activeSet(), prefs.activeSong, 1);
        if (n === null) setTimeout(stop, (60 / c.bpm) * 1000);
        else loadSong(n);
      }
    },
  });

  const start = async () => {
    setSeed((Math.random() * 2 ** 31) | 0);
    setElapsed(0);
    setSongStartBar(0);
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
    nudge: (d) => {
      const set = activeSet();
      const target = set.songs.length ? step(set, prefs.activeSong, d > 0 ? 1 : -1) : null;
      if (target !== null) loadSong(target);
      else setBpm(prefs.bpm + d);
    },
  });
  createEffect(() => {
    const bpm = shownBpm();
    const art = loaded() ? artworkFor(String(bpm), { bg: cssVar("--color-display"), dot: cssVar("--color-accent") }) : null;
    media.update({ bpm, playing: playing(), title: song()?.name, album: song() ? activeSet().name : undefined, artwork: art });
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
  const importFromUrl = () => {
    const code = new URLSearchParams(location.hash.slice(1)).get("set");
    if (!code) return;
    history.replaceState(null, "", location.pathname);
    const set = decodeSet(code);
    if (!set) return say("link not valid");
    setPrefs(produce((p) => {
      p.sets.push(set);
      p.activeSet = set.id;
      p.activeSong = -1;
    }));
    setTab("sets");
    say(`added ${set.name}`);
  };

  void (async () => {
    setPrefs(reconcile(hydrate(await load<Partial<Prefs>>("prefs", {}))));
    setLoaded(true);
    void persistStorage();
    importFromUrl();
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

  const updateActiveSet = (fn: (s: SetList) => SetList) =>
    setPrefs("sets", (sets) => sets.map((s) => (s.id === activeSet().id ? fn(s) : s)));

  const saveCurrentAsSong = () => {
    const n = activeSet().songs.length + 1;
    const s: Song = { id: newId(), name: `song ${n}`, bpm: prefs.bpm, beatsPerBar: prefs.beatsPerBar, subdivision: prefs.subdivision, voice: prefs.voice, bars: null };
    updateActiveSet((set) => addSong(set, s));
    setPrefs("activeSong", n - 1);
    return s;
  };

  const shareSet = async () => {
    const url = `${location.origin}${location.pathname}#set=${encodeSet(activeSet())}`;
    const r = await shareLink(activeSet().name, url);
    if (r === "copied") say("link copied");
    if (r === "failed") say("couldn't share");
  };

  // Space bar plays/stops (keyboards, Bluetooth pedals that send space).
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== "Space" || e.target instanceof HTMLInputElement || sheet()) return;
    e.preventDefault();
    toggle();
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return {
    prefs, setPrefs, playing, now, flash, feel, elapsed, timerLeft, shownBpm, songBar,
    tab, setTab, sheet, setSheet, editing, setEditing, toast, say,
    activeSet, song, nextSong, updateActiveSet,
    toggle, start, stop, tap, setBpm, loadSong, saveCurrentAsSong, shareSet,
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
