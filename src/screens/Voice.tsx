import { For } from "solid-js";
import { VOICES, type VoiceId } from "../audio/voices";
import { useTempo } from "../app/tempo";
import { capabilities } from "../platform/capabilities";
import { feelAvailable, type Feel } from "../state";
import { Stepper, Toggle } from "../ui/controls";
import { DotMatrix } from "../ui/DotMatrix";
import { VoiceIcon } from "../ui/icons";

const ORDER = Object.keys(VOICES) as VoiceId[];

/** Pure: the voice's envelope as dot heights (0..rows), for the display waveform. */
export const envelopeDots = (id: VoiceId, cols = 48, rows = 4): number[] => {
  const v = VOICES[id];
  const span = v.decay * 1.25; // show the whole decay, whatever its length
  return Array.from({ length: cols }, (_, i) => {
    const t = (i / cols) * span;
    const attack = Math.min(1, (i + 1) / 2);
    const amp = attack * Math.exp((-t / v.decay) * 4.6); // matches the exponential ramp to ~0
    return Math.round(Math.sqrt(amp) * rows); // sqrt ≈ perceived loudness, so the tail stays visible
  });
};

/** Dot-matrix waveform: bright above the line, dim mirror below, unlit dots on the baseline. */
const Waveform = (p: { voice: VoiceId }) => {
  const pitch = 6.5;
  const rows = 4;
  const cols = 48;
  const geo = () => {
    const h = envelopeDots(p.voice, cols, rows);
    const x = (i: number) => i * pitch + pitch / 2;
    const y = (k: number) => (rows - k) * pitch + pitch / 2;
    const dot = (cx: number, cy: number) => `M${cx} ${cy}h0`;
    const up = h.flatMap((n, i) => Array.from({ length: n }, (_, k) => dot(x(i), y(k + 1)))).join("");
    const down = h.flatMap((n, i) => Array.from({ length: Math.max(0, n - 1) }, (_, k) => dot(x(i), y(-(k + 1))))).join("");
    const base = h.map((_, i) => dot(x(i), y(0))).join("");
    return { up, down, base, w: cols * pitch, h: (rows * 2 + 1) * pitch };
  };
  return (
    <svg class="waveform" viewBox={`0 0 ${geo().w} ${geo().h}`} aria-hidden="true">
      <path d={geo().base} stroke="var(--color-dot-off)" stroke-width="4" stroke-linecap="round" />
      <path d={geo().down} stroke="var(--color-dot-dim)" stroke-width="4" stroke-linecap="round" />
      <path d={geo().up} stroke="var(--color-dot-on)" stroke-width="4" stroke-linecap="round" />
    </svg>
  );
};

const FEEL: ReadonlyArray<readonly [keyof Feel, string]> = [
  ["buzz", "buzz on the one"],
  ["flash", "flash on the beat"],
  ["stayAwake", "stay awake"],
];

export const Voice = () => {
  const t = useTempo();
  return (
    <>
      <section class="display voice-display">
        <DotMatrix text={t.prefs.voice} set="small" pitch={5} />
        <Waveform voice={t.prefs.voice} />
      </section>

      <section class="grid voices" role="radiogroup" aria-label="sound">
        <For each={ORDER}>
          {(id) => (
            <button
              class="key voice-key"
              classList={{ accent: t.prefs.voice === id }}
              role="radio"
              aria-checked={t.prefs.voice === id}
              onClick={() => {
                t.setPrefs("voice", id);
                t.preview(id);
              }}
            >
              <VoiceIcon id={id} />
              <span>{id}</span>
            </button>
          )}
        </For>
      </section>

      <section class="feel">
        <h2 class="section-label">feel</h2>
        <For each={FEEL}>
          {([key, label]) => (
            <div class="row" classList={{ unavailable: !feelAvailable(key, capabilities) }}>
              <span>{label}</span>
              <Toggle label={label} on={t.prefs.feel[key]} disabled={!feelAvailable(key, capabilities)} onChange={(v) => t.setPrefs("feel", key, v)} />
            </div>
          )}
        </For>
        <div class="row">
          <span>headphone delay</span>
          <Stepper label="headphone delay" value={t.prefs.latencyMs / 10} min={0} max={40} format={(v) => `${v * 10}ms`} onChange={(v) => t.setPrefs("latencyMs", v * 10)} />
        </div>
      </section>
    </>
  );
};
