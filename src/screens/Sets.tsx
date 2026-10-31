import { For, Show } from "solid-js";
import { useTempo } from "../app/tempo";
import type { Song } from "../core/sets";
import { DotMatrix } from "../ui/DotMatrix";
import * as Icon from "../ui/icons";

/** Tiny bar meter: one tick per beat, accent on beat 1, taller for faster songs. */
const Meter = (p: { song: Song; dim: boolean }) => (
  <span class="meter" aria-hidden="true">
    <For each={Array.from({ length: Math.min(p.song.beatsPerBar, 8) }, (_, i) => i)}>
      {(i) => <span class="meter-tick" classList={{ one: i === 0, dim: p.dim }} style={{ height: `${8 + Math.round(((p.song.bpm - 40) / 200) * 10)}px` }} />}
    </For>
  </span>
);

export const Sets = () => {
  const t = useTempo();
  const songs = () => t.activeSet().songs;
  const state = (i: number) => (i === t.prefs.activeSong ? "current" : i === t.prefs.activeSong + 1 ? "next" : i < t.prefs.activeSong ? "played" : "ready");

  const openSong = (s: Song) => {
    t.setEditing(s.id);
    t.setSheet("song");
  };

  return (
    <>
      <section class="display set-display">
        <div class="display-top">
          <span>{t.activeSet().name}</span>
          <Show when={songs().length}>
            <span>
              {Math.max(0, t.prefs.activeSong + 1)} / {songs().length}
            </span>
          </Show>
        </div>
        <Show
          when={t.nextSong() ?? (t.prefs.activeSong < 0 ? songs()[0] : undefined)}
          fallback={<div class="set-empty">{songs().length ? "end of set" : "no songs yet"}</div>}
        >
          {(up) => (
            <div class="set-next">
              <div>
                <span class="set-label">up next →</span>
                <span class="set-name">{up().name}</span>
              </div>
              <DotMatrix text={String(up().bpm)} set="big" pitch={2.6} />
            </div>
          )}
        </Show>
        <Show when={t.song()}>
          {(s) => (
            <div class="set-now">
              <div class="set-now-row">
                <span>now · {s().name} · {s().bpm}</span>
                <Show when={s().bars && t.playing() && t.songBar() >= 0}>
                  <span class="accent-text">
                    bar {t.songBar() + 1} / {s().bars}
                  </span>
                </Show>
              </div>
              <Show when={s().bars}>
                {(bars) => (
                  <div class="progress" aria-hidden="true">
                    <For each={Array.from({ length: 16 }, (_, i) => i)}>
                      {(i) => <span classList={{ done: t.playing() && (t.songBar() + 1) / bars() > i / 16, at: t.playing() && Math.floor(((t.songBar() + 1) / bars()) * 16) === i }} />}
                    </For>
                  </div>
                )}
              </Show>
            </div>
          )}
        </Show>
      </section>

      <ol class="songs">
        <For each={songs()}>
          {(s, i) => (
            <li class={`song ${state(i())}`}>
              <button class="slot" aria-label={`play ${s.name}`} onClick={() => t.loadSong(i())}>
                {String(i() + 1).padStart(2, "0")}
              </button>
              <button class="song-main" onClick={() => openSong(s)}>
                <span class="song-name">
                  {s.name}
                  <Show when={state(i()) === "next"}>
                    <em>next</em>
                  </Show>
                </span>
                <span class="song-meta">
                  {s.beatsPerBar}/4
                  <Show when={s.bars}> · {s.bars} bars</Show>
                </span>
              </button>
              <Meter song={s} dim={state(i()) === "played"} />
              <span class="song-bpm">{s.bpm}</span>
            </li>
          )}
        </For>
        <li class="song add">
          <button class="slot dashed" aria-label="add the current tempo as a song" onClick={() => openSong(t.saveCurrentAsSong())}>
            <Icon.Plus />
          </button>
          <span class="song-name muted">add current</span>
        </li>
      </ol>

      <section class="grid set-actions">
        <button class="key wide span-2" disabled={!songs().length} onClick={() => void t.shareSet()}>
          <Icon.Share />
          <span>share set</span>
        </button>
        <button class="key wide span-2 slate" aria-pressed={t.prefs.autoNext} onClick={() => t.setPrefs("autoNext", (v) => !v)}>
          <span class="led" classList={{ on: t.prefs.autoNext }} />
          <span>auto-next</span>
        </button>
      </section>
    </>
  );
};
