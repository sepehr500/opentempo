import { describe, expect, it } from "vitest";
import { CARRIER_SECONDS, positionState, silentWav } from "./media";

const text = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.slice(at, at + n));

describe("silent carrier", () => {
  const wav = silentWav(CARRIER_SECONDS);
  const v = new DataView(wav.buffer);

  it("is a valid mono 16-bit PCM WAV", () => {
    expect([text(wav, 0, 4), text(wav, 8, 4), text(wav, 12, 4), text(wav, 36, 4)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(v.getUint32(4, true)).toBe(wav.length - 8);
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(wav.length - 44);
  });

  it("is long enough for Chrome (> 5 s) and WebKit (> 0.95 s)", () => {
    const seconds = v.getUint32(40, true) / v.getUint32(28, true);
    expect(seconds).toBe(CARRIER_SECONDS);
    expect(seconds).toBeGreaterThan(5);
  });

  it("is digital silence", () => {
    expect(wav.slice(44).every((x) => x === 0)).toBe(true);
  });
});

describe("lock-screen position", () => {
  it("is live without a practice timer", () => {
    expect(positionState(null, 42)).toEqual({ duration: Infinity, position: 0, playbackRate: 1 });
  });

  it("tracks the practice timer", () => {
    expect(positionState(600, 90)).toEqual({ duration: 600, position: 90, playbackRate: 1 });
  });

  it("never reports a position outside 0…duration (the API throws)", () => {
    expect(positionState(600, 601).position).toBe(600);
    expect(positionState(600, -1).position).toBe(0);
  });
});
