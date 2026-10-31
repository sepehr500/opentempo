// Imperative shell around the pure timeline: schedules clicks on the audio clock
// ("lookahead scheduling") and reports what is audible now for the UI.
import { clicks, origin, resumeClicks } from "../core/timeline";
import type { Click, Settings } from "../core/types";
import { VOICES, type VoiceId } from "./voices";

const LOOKAHEAD_S = 0.12;
/** Hidden/locked pages may get their ticks late (timer throttling), so schedule further ahead. */
const HIDDEN_LOOKAHEAD_S = 1.5;
const TICK_MS = 25;
/** Clicks heard longer ago than this (e.g. while the screen was locked) are not shown. */
const STALE_S = 0.25;
/** Bound on clicks queued for the display: covers the hidden lookahead at 300 bpm in 16ths. */
const MAX_VISUAL = 64;

export type EngineEvents = {
  /** Fired (on an animation frame) when a click becomes audible. */
  onClick: (c: Click) => void;
};

type Running = {
  readonly t0: number; // audio-clock time of timeline 0
  readonly bus: GainNode; // this run's clicks; cut on stop so nothing already scheduled sounds
  gen: Generator<Click>;
  pending: Click | null;
  lastScheduled: Click | null;
  readonly visual: Click[];
};

export const createEngine = (events: EngineEvents) => {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let settings: Settings | null = null;
  let voice: VoiceId = "wood";
  let level = 0.8;
  let extraLatency = 0; // seconds; manual headphone (Bluetooth) delay
  let run: Running | null = null;
  let raf = 0;
  const ticker = new Worker(new URL("./ticker.worker.ts", import.meta.url), { type: "module" });

  const ensureContext = async (): Promise<AudioContext> => {
    if (!ctx) {
      // iOS: play through the ringer switch like a media app.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "playback";
      ctx = new AudioContext({ latencyHint: "interactive" });
      master = ctx.createGain();
      master.gain.value = level;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== "running") await ctx.resume();
    return ctx;
  };

  const sound = (c: Click, at: number, id: VoiceId, out: AudioNode) => {
    if (!ctx || c.muted) return;
    const v = VOICES[id];
    const env = ctx.createGain();
    env.gain.setValueAtTime(v.gain[c.kind], at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + v.decay);
    env.connect(out);
    const src =
      v.wave === "noise"
        ? Object.assign(ctx.createBufferSource(), { buffer: noise })
        : Object.assign(ctx.createOscillator(), { type: v.wave });
    if (src instanceof OscillatorNode) src.frequency.setValueAtTime(v.freq[c.kind], at);
    if (v.wave === "noise") {
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = v.freq[c.kind];
      src.connect(hp).connect(env);
    } else src.connect(env);
    src.start(at);
    src.stop(at + v.decay + 0.01);
  };

  const schedule = () => {
    if (!ctx || !run) return;
    const horizon = ctx.currentTime + (document.visibilityState === "hidden" ? HIDDEN_LOOKAHEAD_S : LOOKAHEAD_S);
    for (;;) {
      const c = run.pending ?? run.gen.next().value;
      if (run.t0 + c.time >= horizon) {
        run.pending = c;
        break;
      }
      run.pending = null;
      sound(c, run.t0 + c.time, voice, run.bus);
      run.lastScheduled = c;
      run.visual.push(c);
      if (run.visual.length > MAX_VISUAL) run.visual.shift(); // no frames while hidden
    }
  };

  const silence = (r: Running) => {
    if (!ctx) return;
    const t = ctx.currentTime;
    r.bus.gain.setValueAtTime(1, t);
    r.bus.gain.linearRampToValueAtTime(0, t + 0.005);
    setTimeout(() => r.bus.disconnect(), 50);
  };

  const frame = () => {
    if (!ctx || !run) return;
    const heard = ctx.currentTime - (ctx.outputLatency || 0) - extraLatency;
    while (run.visual.length && run.t0 + run.visual[0].time <= heard) {
      const c = run.visual.shift()!;
      if (heard - (run.t0 + c.time) < STALE_S) events.onClick(c);
    }
    raf = requestAnimationFrame(frame);
  };

  ticker.onmessage = schedule;

  /** Re-plan from the next unscheduled click; already-scheduled audio is left alone. */
  const replan = (s: Settings) => {
    if (!run?.pending) return;
    run.gen = resumeClicks(s, run.pending);
    run.pending = null;
  };

  return {
    async start(s: Settings) {
      const ac = await ensureContext();
      settings = s;
      if (run) silence(run);
      const bus = ac.createGain();
      bus.connect(master!);
      run = { t0: ac.currentTime + 0.06, bus, gen: clicks(s, origin(s)), pending: null, lastScheduled: null, visual: [] };
      schedule();
      ticker.postMessage({ cmd: "start", ms: TICK_MS });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    stop() {
      ticker.postMessage({ cmd: "stop" });
      cancelAnimationFrame(raf);
      if (run) silence(run);
      run = null;
    },
    update(s: Settings) {
      const changed = settings !== s;
      settings = s;
      if (changed) replan(s);
    },
    setVoice(v: VoiceId) {
      voice = v;
    },
    /** Play one accented click of a voice, now. */
    async preview(id: VoiceId) {
      const ac = await ensureContext();
      sound({ time: 0, bar: 0, beat: 0, sub: 0, phase: 0, kind: "accent", countIn: false, muted: false, bpm: 0 }, ac.currentTime + 0.01, id, master!);
    },
    setLatencyMs(ms: number) {
      extraLatency = Math.max(0, ms) / 1000;
    },
    setLevel(l: number) {
      level = l;
      if (master) master.gain.value = l;
    },
    /** Audio-clock seconds since playback started (for the practice timer). */
    elapsed: () => (ctx && run ? Math.max(0, ctx.currentTime - run.t0) : 0),
    get running() {
      return run !== null;
    },
  };
};

export type Engine = ReturnType<typeof createEngine>;
