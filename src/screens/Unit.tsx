import { For, Show } from "solid-js";
import { VOICES, type VoiceId } from "../audio/voices";
import { useTempo } from "../app/tempo";
import { markingOf } from "../core/italian";
import { FAMILIES, familyIndex, groupStarts, groupingLabel, hasGroupings, maxSplit, meterAt, meterOf, nextGrouping, quarterBpm, splitGlyph } from "../core/meter";
import type { Subdivision } from "../core/types";
import { formatClock } from "../state";
import { DotMatrix } from "../ui/DotMatrix";
import * as Icon from "../ui/icons";
import { Knob } from "../ui/Knob";

const VOICE_ORDER = Object.keys(VOICES) as VoiceId[];

export const Display = () => {
  const t = useTempo();
  const beatState = (i: number) => {
    const c = t.now();
    if (!t.playing() || !c) return "off";
    if (c.muted) return i <= c.beat ? "dim" : "off";
    return i === c.beat ? "on" : i < c.beat ? "dim" : "off";
  };
  const meter = () => meterOf(t.prefs.meter);
  const starts = () => groupStarts(meter());
  return (
    <section class="display" classList={{ flash: t.flash() }}>
      <div class="display-top">
        <span class="display-meter-row">
          <Show when={hasGroupings(t.prefs.meter)} fallback={<span>{meter().label}</span>}>
            <button class="display-meter" aria-label={`${meter().label}, grouped ${groupingLabel(meter())}. Change grouping`} onClick={() => t.setPrefs("meter", nextGrouping(t.prefs.meter))}>
              {meter().label} <span class="display-grouping">{groupingLabel(meter())}</span>
            </button>
          </Show>
          {/* which note the tempo counts, in /8 */}
          <Show when={meter().unit === 8}>
            <span class="display-pulse" aria-label={meter().stepsPerBeat === 3 ? "tempo counts dotted quarters" : "tempo counts eighths"}>
              <Icon.Note kind={meter().stepsPerBeat === 3 ? "dotted" : "eighth"} />=
            </span>
          </Show>
        </span>
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
            <Show when={t.prefs.timer.on} fallback={markingOf(quarterBpm(meter(), t.shownBpm()))}>
              <Icon.Timer size={11} /> {formatClock(t.playing() ? t.timerLeft() : t.prefs.timer.minutes * 60)}
            </Show>
          </span>
        </div>
      </div>
      <div class="beats">
        <For each={meter().groups.map((_, i) => i)}>
          {(i) => (
            <div class="beat" style={{ "flex-grow": meter().unit === 8 ? meter().groups[i] : 1 }}>
              <div class={`beat-bar ${beatState(i)}`} />
              <span classList={{ current: beatState(i) === "on" }}>{meter().unit === 8 ? starts()[i] + 1 : i + 1}</span>
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
  const meter = () => meterOf(p.meter);
  // /8 meters offer three split levels; a /4 split of 4 becomes sixteenths there.
  const setMeter = (i: number) => {
    const next = meterAt(i);
    if (meterOf(next).label === meter().label) return; // keep the chosen grouping
    t.setPrefs("meter", next);
    if (p.subdivision > maxSplit(meterOf(next))) t.setPrefs("subdivision", maxSplit(meterOf(next)));
  };
  return (
    <>
      <Display />
      <section class="knobs">
        <Knob label="tempo" color="blue" value={p.bpm} min={t.limits.MIN_BPM} max={t.limits.MAX_BPM} sensitivity={3} onChange={t.setBpm} display={t.shownBpm()} />
        <Knob label="meter" color="green" value={familyIndex(p.meter)} min={0} max={FAMILIES.length - 1} sensitivity={14} onChange={setMeter} display={meter().label} />
        <Knob label="split" color="cream" value={Math.min(p.subdivision, maxSplit(meter()))} min={1} max={maxSplit(meter())} sensitivity={20} onChange={(v) => t.setPrefs("subdivision", v as Subdivision)} display={splitGlyph(meter(), p.subdivision)} />
        <Knob label="level" color="accent" value={p.level} min={0} max={100} step={5} sensitivity={4} onChange={(v) => t.setPrefs("level", v)} />
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
          <button class="key wide span-2 slate" onPointerDown={t.tap}>
            <Icon.Tap />
            <span>tap</span>
          </button>
        </div>
        <button class={`key play-key ${t.playing() ? "slate" : "accent"}`} onClick={t.toggle} aria-pressed={t.playing()}>
          <Show when={t.playing()} fallback={<Icon.Play />}>
            <Icon.Stop />
          </Show>
          <span>{t.playing() ? "stop" : "play"}</span>
        </button>
      </section>
    </>
  );
};
