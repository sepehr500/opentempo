import { For, Show, createEffect, onCleanup, type JSX } from "solid-js";
import { buzz } from "../platform/device";
import { claims, offsetFor, pushSample, releaseVelocity, shouldDismiss, type Sample } from "./sheetDrag";

// ── bottom sheet on native <dialog>: focus trap, Escape, and inertness for free ──
export const Sheet = (p: { open: boolean; onClose: () => void; children: JSX.Element; label: string }) => {
  let el!: HTMLDialogElement;
  createEffect(() => {
    if (p.open && !el.open) {
      // Cover everything from the function row down, so no key tops peek above the sheet.
      const row = document.querySelector(".fn-row");
      const top = row ? row.getBoundingClientRect().top : innerHeight; // no function row: fit content
      el.style.setProperty("--sheet-min", `${Math.max(0, innerHeight - top)}px`);
      el.showModal();
    }
    if (!p.open && el.open) el.close();
  });
  const onClick = (e: MouseEvent) => e.target === el && p.onClose(); // tap above the sheet

  // ── drag down to dismiss ──
  let body!: HTMLDivElement;
  type Drag = { id: number; x0: number; y0: number; claimed: boolean; samples: Sample[] };
  let drag: Drag | null = null;
  /** Controls with their own drag or text input keep it. */
  const ownsGesture = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select, [role=slider], .ruler-track");
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const place = (y: number, animate: boolean) => {
    body.style.transition = animate && !reducedMotion() ? "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)" : "none";
    body.style.transform = y ? `translateY(${y}px)` : "";
  };
  const swallowClick = () => {
    const stop = (e: Event) => (e.stopPropagation(), e.preventDefault());
    body.addEventListener("click", stop, { capture: true, once: true });
    setTimeout(() => body.removeEventListener("click", stop, { capture: true }), 0); // no click came
  };
  const down = (e: PointerEvent) => {
    if (drag || ownsGesture(e.target) || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, claimed: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
  };
  const move = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    drag.samples = pushSample(drag.samples, { y: e.clientY, t: e.timeStamp });
    if (!drag.claimed) {
      if (!claims(dx, dy)) return;
      drag.claimed = true;
      body.setPointerCapture(e.pointerId);
    }
    place(offsetFor(dy), false);
  };
  const up = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    // A fast flick can arrive with no moves in between (moves are coalesced per frame): judge the
    // whole gesture at release too, not only from the moves seen.
    if (!d.claimed && !claims(dx, dy)) return; // a tap: let the click through
    swallowClick();
    const last = d.samples[d.samples.length - 1];
    // Count the release point only if it moved; a lift in place must not dilute the flick.
    const samples = e.clientY !== last.y ? pushSample(d.samples, { y: e.clientY, t: e.timeStamp }) : d.samples;
    if (e.type !== "pointercancel" && shouldDismiss(dy, releaseVelocity(samples, e.timeStamp), body.offsetHeight)) {
      place(body.offsetHeight, true);
      setTimeout(() => {
        p.onClose();
        place(0, false);
      }, reducedMotion() ? 0 : 180);
    } else place(0, true);
  };

  return (
    <dialog ref={el} class="sheet" aria-label={p.label} onClose={p.onClose} onCancel={p.onClose} onClick={onClick}>
      <div class="sheet-body" ref={body} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div class="grabber" aria-hidden="true" />
        <Show when={p.open}>{p.children}</Show>
      </div>
    </dialog>
  );
};

export const SheetHeader = (p: { icon: JSX.Element; title: string; on?: boolean; onToggle?: (v: boolean) => void }) => (
  <header class="sheet-head">
    <span class="sheet-title">
      {p.icon}
      {p.title}
    </span>
    <Show when={p.onToggle}>
      <Toggle label={p.title} on={!!p.on} onChange={p.onToggle!} />
    </Show>
  </header>
);

// ── toggle: slate track, accent thumb; disabled when the device can't do it ──
export const Toggle = (p: { label: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) => (
  <button
    class="toggle"
    role="switch"
    aria-label={p.label}
    aria-checked={p.on && !p.disabled}
    disabled={p.disabled}
    classList={{ on: p.on && !p.disabled }}
    onClick={() => p.onChange(!p.on)}
  >
    <span class="toggle-thumb" />
  </button>
);

// ── stepper: − value + on the grid ──
export const Stepper = (p: { value: number; min: number; max: number; unit?: string; label: string; onChange: (v: number) => void; format?: (v: number) => string }) => {
  const set = (v: number) => {
    const next = Math.min(p.max, Math.max(p.min, v));
    if (next !== p.value) {
      buzz(4);
      p.onChange(next);
    }
  };
  return (
    <div class="stepper" role="group" aria-label={p.label}>
      <button class="key step-btn" aria-label={`less ${p.label}`} disabled={p.value <= p.min} onClick={() => set(p.value - 1)}>
        −
      </button>
      <div class="step-value">
        <span>{p.format ? p.format(p.value) : p.value}</span>
        <Show when={p.unit}>
          <small>{p.unit}</small>
        </Show>
      </div>
      <button class="key step-btn" aria-label={`more ${p.label}`} disabled={p.value >= p.max} onClick={() => set(p.value + 1)}>
        +
      </button>
    </div>
  );
};

// ── segmented choice: keys on the grid, one lit ──
export const Choice = <T extends string | number>(p: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render: (v: T) => JSX.Element;
  label: string;
  disabled?: (v: T) => boolean;
  class?: string;
}) => (
  <div class={`grid choice ${p.class ?? ""}`} role="radiogroup" aria-label={p.label}>
    <For each={p.options}>
      {(o) => (
        <button
          class="key choice-key"
          classList={{ accent: o === p.value }}
          role="radio"
          aria-checked={o === p.value}
          disabled={p.disabled?.(o)}
          onClick={() => p.onChange(o)}
        >
          {p.render(o)}
        </button>
      )}
    </For>
  </div>
);

// ── range ruler: a row of dots with two draggable handles ──
export const RangeRuler = (p: { min: number; max: number; lo: number; hi: number; step?: number; onChange: (lo: number, hi: number) => void }) => {
  let track!: HTMLDivElement;
  let active: "lo" | "hi" | null = null;
  const step = () => p.step ?? 1;
  const pct = (v: number) => ((v - p.min) / (p.max - p.min)) * 100;
  const valueAt = (clientX: number) => {
    const r = track.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round((p.min + t * (p.max - p.min)) / step()) * step();
  };
  const move = (e: PointerEvent) => {
    if (!active) return;
    const v = valueAt(e.clientX);
    if (active === "lo" && v !== p.lo) p.onChange(Math.min(v, p.hi - step()), p.hi);
    if (active === "hi" && v !== p.hi) p.onChange(p.lo, Math.max(v, p.lo + step()));
  };
  const down = (e: PointerEvent) => {
    const v = valueAt(e.clientX);
    active = Math.abs(v - p.lo) <= Math.abs(v - p.hi) ? "lo" : "hi";
    track.setPointerCapture(e.pointerId);
    move(e);
  };
  const up = () => (active = null);
  const key = (which: "lo" | "hi") => (e: KeyboardEvent) => {
    const d = { ArrowRight: step(), ArrowUp: step(), ArrowLeft: -step(), ArrowDown: -step() }[e.key];
    if (!d) return;
    e.preventDefault();
    if (which === "lo") p.onChange(Math.max(p.min, Math.min(p.lo + d, p.hi - step())), p.hi);
    else p.onChange(p.lo, Math.min(p.max, Math.max(p.hi + d, p.lo + step())));
  };
  const ticks = Array.from({ length: 29 }, (_, i) => i / 28);
  onCleanup(() => (active = null));
  return (
    <div class="ruler">
      <div class="ruler-track" ref={track} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <For each={ticks}>
          {(t) => {
            const v = p.min + t * (p.max - p.min);
            return <span class="ruler-dot" classList={{ in: v >= p.lo && v <= p.hi }} style={{ left: `${t * 100}%` }} />;
          }}
        </For>
        <span class="ruler-fill" style={{ left: `${pct(p.lo)}%`, width: `${pct(p.hi) - pct(p.lo)}%` }} />
        <span class="ruler-handle" role="slider" tabindex="0" aria-label="lowest tempo" aria-valuenow={p.lo} aria-valuemin={p.min} aria-valuemax={p.max} style={{ left: `${pct(p.lo)}%` }} onKeyDown={key("lo")} />
        <span class="ruler-handle" role="slider" tabindex="0" aria-label="highest tempo" aria-valuenow={p.hi} aria-valuemin={p.min} aria-valuemax={p.max} style={{ left: `${pct(p.hi)}%` }} onKeyDown={key("hi")} />
      </div>
      <div class="ruler-scale">
        <For each={[p.min, p.min + (p.max - p.min) / 4, p.min + (p.max - p.min) / 2, p.min + (3 * (p.max - p.min)) / 4, p.max]}>{(v) => <span>{Math.round(v)}</span>}</For>
      </div>
    </div>
  );
};
