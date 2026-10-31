import { createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { VOICES, type VoiceId } from "../audio/voices";
import type { ClickKind } from "../core/types";
import { COLS, ROWS, dotPath, gridDots, lookAt, scopeDots, traceOf, type Look } from "./scope";

/** One heard click (or preview), stamped with performance.now() at the moment it became audible. */
export type Strike = { readonly voice: VoiceId; readonly kind: ClickKind; readonly at: number; readonly seed: number };

const PITCH = 5;
const GRID = dotPath(gridDots(), PITCH);
const reducedMotion = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

/**
 * Dot-matrix oscilloscope. With no strike it shows the voice's accent as a held capture (`hold`) or a
 * flat line; a strike sweeps its trace in, then (unless held) glows dim and goes flat. Animation frames
 * run only while a strike is moving.
 */
export const Scope = (p: { voice: VoiceId; strike: Strike | null; hold: boolean }) => {
  const [clock, setClock] = createSignal(0);
  let raf = 0;
  const opts = () => ({ hold: p.hold, still: reducedMotion?.matches ?? false });

  const look = createMemo<Look & { done: boolean }>(
    () => {
      const s = p.strike;
      if (s) return lookAt(clock() - s.at, opts());
      return { head: COLS, level: p.hold ? "on" : "flat", done: true };
    },
    { head: COLS, level: "flat", done: true },
    { equals: (a, b) => a.head === b.head && a.level === b.level && a.done === b.done },
  );

  const tick = (now: number) => {
    setClock(now);
    raf = look().done ? 0 : requestAnimationFrame(tick);
  };
  createEffect(
    on(
      () => p.strike,
      (s) => {
        if (!s) return;
        setClock(performance.now());
        if (!raf && !look().done) raf = requestAnimationFrame(tick);
      },
    ),
  );
  onCleanup(() => cancelAnimationFrame(raf));

  const trace = createMemo(() => {
    const s = p.strike;
    return s ? traceOf(VOICES[s.voice], s.kind, s.seed) : traceOf(VOICES[p.voice], "accent");
  });
  const lit = createMemo(() => {
    const { on, dim } = scopeDots(trace(), look());
    return { on: dotPath(on, PITCH), dim: dotPath(dim, PITCH) };
  });

  const w = COLS * PITCH;
  const h = ROWS * PITCH;
  const dot = PITCH * 0.73; // same dot as the name above
  return (
    <svg class="scope" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={GRID} stroke="var(--color-dot-off)" stroke-width={dot} stroke-linecap="round" />
      <path d={lit().dim} stroke="var(--color-dot-dim)" stroke-width={dot} stroke-linecap="round" />
      <path d={lit().on} stroke="var(--color-dot-on)" stroke-width={dot} stroke-linecap="round" />
    </svg>
  );
};
