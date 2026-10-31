// Imperative shell around the pure timeline: schedules clicks on the audio clock
// ("lookahead scheduling") and reports what is audible now for the UI.
import { clicks, origin, resumeClicks } from "../core/timeline";
import type { Click, Settings } from "../core/types";
import { VOICES, type VoiceId } from "./voices";

const LOOKAHEAD_S = 0.12;
const TICK_MS = 25;

export type EngineEvents = {
  /** Fired (on an animation frame) when a click becomes audible. */
  onClick: (c: Click) => void;
};

type Running = {
  readonly t0: number; // audio-clock time of timeline 0
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
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== "running") await ctx.resume();
    return ctx;
  };

  const sound = (c: Click, at: number) => {
    if (!ctx || !master || c.muted) return;
    const v = VOICES[voice];
    const env = ctx.createGain();
    env.gain.setValueAtTime(v.gain[c.kind], at);
    env.gain.exponentialRampToValueAtTime(0.0001, at + v.decay);
    env.connect(master);
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
    const horizon = ctx.currentTime + LOOKAHEAD_S;
    for (;;) {
      const c = run.pending ?? run.gen.next().value;
      if (run.t0 + c.time >= horizon) {
        run.pending = c;
        break;
      }
      run.pending = null;
      sound(c, run.t0 + c.time);
      run.lastScheduled = c;
      run.visual.push(c);
    }
  };

  const frame = () => {
    if (!ctx || !run) return;
    const heard = ctx.currentTime - (ctx.outputLatency || 0);
    while (run.visual.length && run.t0 + run.visual[0].time <= heard) events.onClick(run.visual.shift()!);
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
      run = { t0: ac.currentTime + 0.06, gen: clicks(s, origin(s)), pending: null, lastScheduled: null, visual: [] };
      schedule();
      ticker.postMessage({ cmd: "start", ms: TICK_MS });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    },
    stop() {
      ticker.postMessage({ cmd: "stop" });
      cancelAnimationFrame(raf);
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
    setLevel(level: number) {
      if (master) master.gain.value = level;
    },
    /** Audio-clock seconds since playback started (for the practice timer). */
    elapsed: () => (ctx && run ? Math.max(0, ctx.currentTime - run.t0) : 0),
    get running() {
      return run !== null;
    },
  };
};

export type Engine = ReturnType<typeof createEngine>;
