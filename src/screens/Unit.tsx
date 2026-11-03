import { For, Show } from "solid-js";
import { VOICES, type VoiceId } from "../audio/voices";
import { useTempo } from "../app/tempo";
import { markingOf } from "../core/italian";
import type { Subdivision } from "../core/types";
import { signatureOf } from "../core/signature";
import { formatClock, splitLabel } from "../state";
import { DotMatrix } from "../ui/DotMatrix";
import * as Icon from "../ui/icons";
import { Knob } from "../ui/Knob";

const VOICE_ORDER = Object.keys(VOICES) as VoiceId[];

export const Display = () => {
  const t = useTempo();
  // One state per piece of a beat line: lit while it clicks, dim once passed in this bar.
  const pieceState = (i: number, j: number) => {
    const c = t.now();
    if (!t.playing() || !c) return "off";
    const at = c.countIn ? 0 : c.sub; // count-in clicks the beat only
    const passed = i < c.beat || (i === c.beat && j < at);
    if (c.muted) return passed || (i === c.beat && j === at) ? "dim" : "off";
    return i === c.beat && j === at ? "on" : passed ? "dim" : "off";
  };
  const beatOn = (i: number) => { const c = t.now(); return t.playing() && !!c && !c.muted && c.beat === i; };
  const pieces = () => Array.from({ length: t.prefs.subdivision }, (_, j) => j);
  return (
    <section class="display" classList={{ flash: t.flash() }}>
      <div class="display-top">
        <button class="display-meter" aria-haspopup="dialog" aria-label="time signature" onClick={() => t.setSheet("meter")}>
          {signatureOf(t.prefs.beatsPerBar, t.prefs.subdivision)?.id ?? "custom"}
          <Icon.Chevron />
        </button>
        <Show when={t.playing() && t.now()}>
          {(c) => (
            <span class="display-bar">
              <Show when={c().muted}>
                <Icon.Muted />
              </Show>
              {c().countIn ? "count" : `bar ${c().bar + 1}`}
            </span>
          )}
        </Show>
      </div>
      <div class="display-main">
        <DotMatrix text={String(t.shownBpm())} />
        <div class="display-side">
          <span class="display-unit">bpm</span>
          <span class="display-sub">
            <Show when={t.prefs.timer.on} fallback={markingOf(t.shownBpm())}>
              <Icon.Timer size={11} /> {formatClock(t.playing() ? t.timerLeft() : t.prefs.timer.minutes * 60)}
            </Show>
          </span>
        </div>
      </div>
      <div class="beats">
        <For each={Array.from({ length: t.prefs.beatsPerBar }, (_, i) => i)}>
          {(i) => (
            <div class="beat">
              <div class="beat-line">
                <For each={pieces()}>{(j) => <div class={`beat-bar ${pieceState(i, j)}`} />}</For>
              </div>
              <span classList={{ current: beatOn(i) }}>{i + 1}</span>
            </div>
          )}
        </For>
      </div>
    </section>
  );
};

const FnKey = (p: { label: string; on: boolean; value: string; icon: any; onClick: () => void }) => (
  <button class={`key fn ${p.on ? "accent" : ""}`} aria-haspopup="dialog" aria-label={`${p.label}${p.on ? `, ${p.value}` : ", off"}`} onClick={p.onClick}>
    <span class="fn-top">
      {p.icon}
      <Show when={p.on}>
        <span class="fn-value">{p.value}</span>
      </Show>
    </span>
    <span>{p.label}</span>
  </button>
);

export const Unit = () => {
  const t = useTempo();
  const p = t.prefs;
  return (
    <>
      <Display />
      <section class="knobs">
        <Knob label="tempo" color="blue" value={p.bpm} min={t.limits.MIN_BPM} max={t.limits.MAX_BPM} sensitivity={3} accelerate onChange={t.setBpm} display={t.shownBpm()} />
        <Knob label="beats" color="green" value={p.beatsPerBar} min={1} max={12} onChange={(v) => t.setPrefs("beatsPerBar", v)} />
        <Knob label="split" color="cream" value={p.subdivision} min={1} max={4} onChange={(v) => t.setPrefs("subdivision", v as Subdivision)} display={splitLabel(p.subdivision)} />
        <Knob label="level" color="accent" value={p.level} min={0} max={100} step={5} onChange={(v) => t.setPrefs("level", v)} />
      </section>

      <section class="grid fn-row">
        <FnKey label="random" on={p.random.on} value={`${p.random.min}–${p.random.max}`} icon={<Icon.Dice />} onClick={() => t.setSheet("random")} />
        <FnKey label="gap" on={p.gap.on} value={`${p.gap.play} : ${p.gap.mute}`} icon={<Icon.Gap />} onClick={() => t.setSheet("gap")} />
        <FnKey label="timer" on={p.timer.on} value={formatClock(t.playing() && p.timer.on ? t.timerLeft() : p.timer.minutes * 60)} icon={<Icon.Timer />} onClick={() => t.setSheet("timer")} />
        <FnKey label="count-in" on={p.countIn.on} value={`${p.countIn.bars} ${p.countIn.bars === 1 ? "bar" : "bars"}`} icon={<Icon.CountIn />} onClick={() => t.setSheet("countIn")} />
      </section>

      <section class="transport">
        <div class="grid">
          <button class="key wide span-2" aria-label={`sound: ${p.voice}`} onClick={() => t.setPrefs("voice", (v) => VOICE_ORDER[(VOICE_ORDER.indexOf(v) + 1) % VOICE_ORDER.length])}>
            <Icon.Wave />
            <span>{p.voice}</span>
          </button>
          <button class="key wide span-2 slate" onPointerDown={t.tap} title="tap tempo (T)">
            <Icon.Tap />
            <span>tap</span>
          </button>
        </div>
        <button class={`key play-key ${t.playing() ? "slate" : "accent"}`} onClick={t.toggle} aria-pressed={t.playing()} title="play / stop (space)">
          <Show when={t.playing()} fallback={<Icon.Play />}>
            <Icon.Stop />
          </Show>
          <span>{t.playing() ? "stop" : "play"}</span>
        </button>
      </section>
    </>
  );
};
