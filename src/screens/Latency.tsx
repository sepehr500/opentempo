// Headphone delay: line the visuals and the buzz up with what is heard.
//
// Two ways to find the value, both while the check's own click plays:
//  · tap along to the click and let the app measure the offset (fast, within a few ms), and
//  · watch the beat bars and nudge until each one lights on its click (perceptual, fine).
// The measured value is previewed live before it is used, so the second check confirms the first.
import { For, Match, Show, Switch, createMemo, createSignal, onCleanup } from "solid-js";
import { useTempo } from "../app/tempo";
import { LATENCY_MAX_MS, calibrate, clampLatency, pulse, type Calibration } from "../core/latency";
import { buzz } from "../platform/device";
import { CHECK_PERIOD_MS, detentDue } from "../state";
import { NudgeKey } from "../ui/controls";
import { DotMatrix } from "../ui/DotMatrix";
import * as Icon from "../ui/icons";

/** Taps to measure: four bars of the check. The first two are a lead-in. */
export const CHECK_TAPS = 16;
/** Taps stopped for this long: measure what there is (or give up with too little). */
const IDLE_MS = 3 * CHECK_PERIOD_MS;
const NUDGES = [-10, -1, 1, 10] as const;

type Phase = "listen" | "tap" | "result";

const measure = (taps: readonly number[]): Calibration | null =>
  taps.length ? calibrate(pulse(CHECK_PERIOD_MS, taps[taps.length - 1]), taps) : null;

export const LatencySheet = () => {
  const t = useTempo();
  const [phase, setPhase] = createSignal<Phase>("listen");
  const [taps, setTaps] = createSignal<number[]>([]);
  const [result, setResult] = createSignal<Calibration | null>(null);
  const [candidate, setCandidate] = createSignal(0);
  const live = createMemo(() => measure(taps()));
  let idle: ReturnType<typeof setTimeout> | undefined;
  let lastDetent = 0;

  /** The value on the display, and what the nudge keys move. */
  const value = () => (phase() === "result" ? candidate() : t.prefs.latencyMs);
  const setValue = (ms: number) => {
    const next = clampLatency(ms);
    if (next === value()) return;
    const at = performance.now();
    if (detentDue(at, lastDetent)) {
      buzz(4);
      lastDetent = at;
    }
    if (phase() === "result") {
      setCandidate(next);
      t.check.preview(next);
    } else t.setPrefs("latencyMs", next);
  };

  const begin = () => {
    clearTimeout(idle);
    setTaps([]);
    setResult(null);
    setPhase("tap");
    t.check.setMeasuring(true);
    t.check.preview(null);
    if (!t.check.running()) t.check.start();
  };
  const finish = (all: readonly number[]) => {
    clearTimeout(idle);
    t.check.setMeasuring(false);
    const r = measure(all);
    if (!r) return back();
    setResult(r);
    setCandidate(r.ms);
    t.check.preview(r.ms); // see it before using it
    setPhase("result");
  };
  const back = () => {
    clearTimeout(idle);
    t.check.setMeasuring(false);
    t.check.preview(null);
    setPhase("listen");
  };
  const use = () => {
    t.setPrefs("latencyMs", candidate());
    back();
  };
  const tap = (timeStamp: number) => {
    const at = t.check.tapTime(timeStamp);
    if (at === null || phase() !== "tap") return;
    const all = [...taps(), at];
    setTaps(all);
    clearTimeout(idle);
    if (all.length >= CHECK_TAPS) finish(all);
    else idle = setTimeout(() => finish(taps()), IDLE_MS);
  };

  // Laptops with Bluetooth headphones: space or enter taps too.
  const onKey = (e: KeyboardEvent) => {
    if (phase() !== "tap" || e.repeat || (e.code !== "Space" && e.code !== "Enter")) return;
    e.preventDefault();
    tap(e.timeStamp);
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => {
    window.removeEventListener("keydown", onKey);
    clearTimeout(idle);
    t.check.stop();
  });

  const beat = () => (t.check.running() ? t.now()?.beat ?? -1 : -1);
  const reported = () => (t.now(), t.check.reportedMs());
  const shownMs = () => (phase() === "tap" ? live()?.ms : value());

  return (
    <>
      <header class="sheet-head latency-head">
        <span class="sheet-title">
          <Icon.Headphones />
          headphone delay
        </span>
        <Show when={phase() === "tap"}>
          <button class="key head-key" onClick={back}>
            cancel
          </button>
        </Show>
      </header>

      <section class="display latency-display" aria-live="polite">
        <div class="display-top">
          <Switch>
            <Match when={phase() === "listen"}>
              <span>match bars to click</span>
            </Match>
            <Match when={phase() === "tap"}>
              <span>tap on each click</span>
            </Match>
            <Match when={phase() === "result"}>
              <span classList={{ "accent-text": !result()?.ok }}>{result()?.ok ? "measured" : "unsteady"}</span>
            </Match>
          </Switch>
          <Show when={phase() === "result"}>
            <span>±{result()?.spread}ms</span>
          </Show>
        </div>
        <div class="latency-main">
          <DotMatrix text={shownMs() === undefined ? "" : String(shownMs())} pitch={4} />
          <div class="display-side">
            <span class="display-unit">ms</span>
            {/* On top of what the browser already accounts for, which varies by browser and output. */}
            <Show when={reported() > 0}>
              <span class="display-sub">+{reported()} browser</span>
            </Show>
          </div>
        </div>
        <Show
          when={phase() === "tap"}
          fallback={
            <div class="beats" aria-hidden="true">
              <For each={[0, 1, 2, 3]}>{(i) => <div class="beat-bar" classList={{ on: beat() === i }} />}</For>
            </div>
          }
        >
          <div class="beats tap-progress" aria-label={`${taps().length} of ${CHECK_TAPS} taps`}>
            <For each={[0, 1, 2, 3]}>
              {(bar) => (
                <div class="tap-bar">
                  <For each={[0, 1, 2, 3]}>{(b) => <span classList={{ on: taps().length > bar * 4 + b }} />}</For>
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>

      <Show
        when={phase() !== "tap"}
        fallback={
          <button class="key slate tap-key" onPointerDown={(e) => tap(e.timeStamp)}>
            <Icon.Tap />
            <span>tap</span>
          </button>
        }
      >
        <div class="grid">
          <For each={NUDGES}>
            {(d) => (
              <NudgeKey
                label={`${d < 0 ? "less" : "more"} delay, ${Math.abs(d)}ms`}
                disabled={d < 0 ? value() <= 0 : value() >= LATENCY_MAX_MS}
                onStep={() => setValue(value() + d)}
              >
                {d < 0 ? `−${-d}` : `+${d}`}
              </NudgeKey>
            )}
          </For>
        </div>
        <div class="grid two">
          <Show
            when={phase() === "result"}
            fallback={
              <>
                <button class="key wide" aria-pressed={t.check.running()} onClick={() => (t.check.running() ? t.check.stop() : t.check.start())}>
                  <Show when={t.check.running()} fallback={<Icon.Play />}>
                    <Icon.Stop />
                  </Show>
                  <span>{t.check.running() ? "stop" : "play"}</span>
                </button>
                <button class="key wide accent" onClick={begin}>
                  <Icon.Tap />
                  <span>tap along</span>
                </button>
              </>
            }
          >
            <button class="key wide" classList={{ accent: !result()?.ok }} onClick={begin}>
              <span>retry</span>
            </button>
            <button class="key wide" classList={{ accent: !!result()?.ok }} onClick={use}>
              <Icon.Check />
              <span>use {candidate()}ms</span>
            </button>
          </Show>
        </div>
      </Show>
    </>
  );
};
