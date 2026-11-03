import { describe, expect, it } from "vitest";
import { shouldReload } from "./update";

describe("updates", () => {
  it("reload once a new build has taken over, when stopped", () => {
    expect(shouldReload({ hadController: true, updated: true, playing: false })).toBe(true);
  });
  it("never mid-play, never on a first install, never without an update", () => {
    expect(shouldReload({ hadController: true, updated: true, playing: true })).toBe(false);
    expect(shouldReload({ hadController: false, updated: true, playing: false })).toBe(false);
    expect(shouldReload({ hadController: true, updated: false, playing: false })).toBe(false);
  });
});
