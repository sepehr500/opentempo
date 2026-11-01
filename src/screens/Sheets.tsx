import { For, Match, Show, Switch, createMemo } from "solid-js";
import { useTempo } from "../app/tempo";
import { valuesOf } from "../core/presets";
import { meta } from "./Presets";
import { LatencySheet } from "./Latency";
import { capabilities } from "../platform/capabilities";
import { formatClock } from "../state";
import { Choice, RangeRuler, Sheet, SheetHeader, Stepper } from "../ui/controls";
import * as Icon from "../ui/icons";

const RandomSheet = () => {
  const t = useTempo();
  const r = () => t.prefs.random;
  return (
    <>
      <SheetHeader icon={<Icon.Dice />} title="random" on={r().on} onToggle={(v) => t.setPrefs("random", "on", v)} />
      <div class="sheet-readout">
        {r().min}–{r().max}
        <small>bpm</small>
      </div>
      <RangeRuler min={60} max={200} lo={r().min} hi={r().max} step={5} onChange={(lo, hi) => t.setPrefs("random", { min: lo, max: hi })} />
      <h3 class="section-label">every</h3>
      <Choice label="change every" options={[1, 2, 4, 8] as const} value={r().everyBars as 1 | 2 | 4 | 8} onChange={(v) => t.setPrefs("random", "everyBars", v)} render={(v) => <>{v}<small>{v === 1 ? "bar" : "bars"}</small></>} />
    </>
  );
};

const GapSheet = () => {
  const t = useTempo();
  const g = () => t.prefs.gap;
  const preview = createMemo(() => Array.from({ length: 8 }, (_, i) => i % (g().play + g().mute) < g().play));
  return (
    <>
      <SheetHeader icon={<Icon.Gap />} title="gap" on={g().on} onToggle={(v) => t.setPrefs("gap", "on", v)} />
      <div class="grid gap-preview" aria-hidden="true">
        <For each={preview()}>{(play) => <span classList={{ play, mute: !play }} />}</For>
      </div>
      <div class="grid two">
        <div>
          <h3 class="section-label">play</h3>
          <Stepper label="bars to play" value={g().play} min={1} max={8} unit={g().play === 1 ? "bar" : "bars"} onChange={(v) => t.setPrefs("gap", "play", v)} />
        </div>
        <div>
          <h3 class="section-label">mute</h3>
          <Stepper label="bars to mute" value={g().mute} min={1} max={8} unit={g().mute === 1 ? "bar" : "bars"} onChange={(v) => t.setPrefs("gap", "mute", v)} />
        </div>
      </div>
    </>
  );
};

const TimerSheet = () => {
  const t = useTempo();
  const tm = () => t.prefs.timer;
  return (
    <>
      <SheetHeader icon={<Icon.Timer />} title="timer" on={tm().on} onToggle={(v) => t.setPrefs("timer", "on", v)} />
      <Stepper label="minutes" value={tm().minutes} min={1} max={90} format={(v) => formatClock(v * 60)} onChange={(v) => t.setPrefs("timer", "minutes", v)} />
      <Choice label="preset" options={[5, 10, 15, 20] as const} value={tm().minutes as 5 | 10 | 15 | 20} onChange={(v) => t.setPrefs("timer", "minutes", v)} render={(v) => <>{v}<small>min</small></>} />
      <h3 class="section-label">at end</h3>
      <Choice
        class="halves"
        label="at end"
        options={["stop", "buzz"] as const}
        value={tm().atEnd}
        disabled={(v) => v === "buzz" && !capabilities.vibration}
        onChange={(v) => t.setPrefs("timer", "atEnd", v)}
        render={(v) => (
          <span class="inline">
            {v === "stop" ? <Icon.Square /> : <Icon.Buzz />}
            {v}
          </span>
        )}
      />
    </>
  );
};

const CountInSheet = () => {
  const t = useTempo();
  const c = () => t.prefs.countIn;
  return (
    <>
      <SheetHeader icon={<Icon.CountIn />} title="count-in" on={c().on} onToggle={(v) => t.setPrefs("countIn", "on", v)} />
      <Choice
        class="halves tall-choice"
        label="count-in length"
        options={[1, 2] as const}
        value={c().bars}
        onChange={(v) => t.setPrefs("countIn", "bars", v)}
        render={(v) => (
          <span class="count-choice">
            <span class="count-dots">{"●".repeat(4)}{v === 2 ? `  ${"●".repeat(4)}` : ""}</span>
            <span>
              {v}
              <small>{v === 1 ? "bar" : "bars"}</small>
            </span>
          </span>
        )}
      />
    </>
  );
};

const PresetSheet = () => {
  const t = useTempo();
  const preset = () => t.prefs.presets.find((p) => p.id === t.editing());
  return (
    <Show when={preset()}>
      {(p) => (
        <>
          <header class="sheet-head">
            <input
              class="name-input"
              aria-label="preset name"
              value={p().name}
              maxLength={40}
              onChange={(e) => t.editPreset(p().id, { name: e.currentTarget.value.trim() || p().name })}
            />
          </header>
          <div class="preset-summary">
            <span class="sheet-readout">
              {p().bpm}
              <small>bpm</small>
            </span>
            <span class="preset-meta">{meta(p())}</span>
          </div>
          <div class="grid two">
            <button class="key wide" onClick={() => { t.editPreset(p().id, valuesOf(t.prefs)); t.say("updated"); }}>
              <span>use current</span>
            </button>
            <button
              class="key wide danger"
              onClick={() => {
                const id = p().id;
                t.setSheet(null);
                t.deletePreset(id);
              }}
            >
              <span>delete</span>
            </button>
          </div>
        </>
      )}
    </Show>
  );
};

const TITLES: Record<string, string> = { random: "random tempo", gap: "gap trainer", timer: "practice timer", countIn: "count-in", preset: "preset", latency: "headphone delay" };

export const Sheets = () => {
  const t = useTempo();
  return (
    <Sheet open={t.sheet() !== null} onClose={() => t.setSheet(null)} label={TITLES[t.sheet() ?? "preset"]}>
      <Switch>
        <Match when={t.sheet() === "random"}><RandomSheet /></Match>
        <Match when={t.sheet() === "gap"}><GapSheet /></Match>
        <Match when={t.sheet() === "timer"}><TimerSheet /></Match>
        <Match when={t.sheet() === "countIn"}><CountInSheet /></Match>
        <Match when={t.sheet() === "preset"}><PresetSheet /></Match>
        <Match when={t.sheet() === "latency"}><LatencySheet /></Match>
      </Switch>
    </Sheet>
  );
};
