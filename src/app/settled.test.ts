import { createRoot, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { settled } from "./settled";

describe("settled", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("publishes only the last value once the source stops changing", () =>
    createRoot(async (dispose) => {
      const [src, setSrc] = createSignal(120);
      const s = settled(src, 300);
      for (const v of [121, 122, 123]) {
        setSrc(v);
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(s.value()).toBe(120); // still turning
      await vi.advanceTimersByTimeAsync(300);
      expect(s.value()).toBe(123);
      dispose();
    }));

  it("flush publishes immediately", () =>
    createRoot(async (dispose) => {
      const [src, setSrc] = createSignal("a");
      const s = settled(src, 1000);
      setSrc("b");
      await vi.advanceTimersByTimeAsync(0);
      s.flush();
      expect(s.value()).toBe("b");
      dispose();
    }));
});
