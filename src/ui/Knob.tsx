import type { JSX } from "solid-js";
import { buzz } from "../platform/device";
import { detentDue } from "../state";

export type KnobProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Pixels of vertical drag per step. */
  sensitivity?: number;
  display?: JSX.Element;
  color: "blue" | "green" | "cream" | "accent";
  onChange: (v: number) => void;
};

const SWEEP = 270; // degrees of travel, like a hardware pot

/** Pure: value → indicator angle in degrees (0 = straight up). */
export const angleOf = (v: number, min: number, max: number) =>
  ((Math.min(max, Math.max(min, v)) - min) / (max - min || 1)) * SWEEP - SWEEP / 2;

export const Knob = (props: KnobProps) => {
  const step = () => props.step ?? 1;
  let startY = 0;
  let startV = 0;
  let lastDetent = 0;

  const set = (v: number) => {
    const next = Math.min(props.max, Math.max(props.min, Math.round(v / step()) * step()));
    if (next !== props.value) {
      const at = performance.now();
      if (detentDue(at, lastDetent)) {
        buzz(4); // a detent you can feel (Android)
        lastDetent = at;
      }
      props.onChange(next);
    }
  };

  const down = (e: PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    startY = e.clientY;
    startV = props.value;
  };
  const move = (e: PointerEvent) => {
    if (!(e.currentTarget as Element).hasPointerCapture(e.pointerId)) return;
    set(startV + ((startY - e.clientY) / (props.sensitivity ?? 6)) * step());
  };
  const key = (e: KeyboardEvent) => {
    const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (d) {
      e.preventDefault();
      set(props.value + d * step());
    }
  };

  const angle = () => angleOf(props.value, props.min, props.max);
  const ink = props.color === "cream" ? "var(--color-ink)" : "var(--color-key)";

  return (
    <div class="knob">
      <div
        class="knob-cap"
        role="slider"
        tabindex="0"
        aria-label={props.label}
        aria-valuemin={props.min}
        aria-valuemax={props.max}
        aria-valuenow={props.value}
        onPointerDown={down}
        onPointerMove={move}
        onKeyDown={key}
        onWheel={(e) => {
          e.preventDefault();
          set(props.value - Math.sign(e.deltaY) * step());
        }}
      >
        <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
          <circle cx="34" cy="34" r="32" fill="none" stroke="var(--color-tick)" stroke-width="1.6" stroke-dasharray="1.5 5.2" />
          <circle cx="34" cy="35.5" r="25" fill={`var(--color-${props.color}-rim)`} />
          <circle cx="34" cy="34" r="25" fill={`var(--color-${props.color})`} />
          <circle cx="34" cy="17.5" r="3.5" fill={ink} transform={`rotate(${angle()} 34 34)`} />
        </svg>
      </div>
      <div class="knob-label">
        {props.label} <span class={`knob-value ${props.color}`}>{props.display ?? props.value}</span>
      </div>
    </div>
  );
};
