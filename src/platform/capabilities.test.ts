import { describe, expect, it } from "vitest";
import { detect, isAppleMobile } from "./capabilities";

const fn = () => true;
const android = { userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/140", platform: "Linux armv8l", maxTouchPoints: 5, vibrate: fn, share: fn, wakeLock: {}, mediaSession: {} };
const iphone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5, share: fn, wakeLock: {}, mediaSession: {} };
const ipadAsMac = { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5, share: fn, wakeLock: {}, mediaSession: {} };
const desktopMac = { ...ipadAsMac, maxTouchPoints: 0 };

const caps = (n: object) => detect({ navigator: n as Navigator });

describe("capabilities", () => {
  it("Android has everything", () => {
    expect(caps(android)).toEqual({ vibration: true, wakeLock: true, mediaSession: true, share: true, lockedPlayback: true });
  });

  it("iPhone has no vibration and no locked playback", () => {
    expect(caps(iphone)).toMatchObject({ vibration: false, lockedPlayback: false, wakeLock: true, share: true });
  });

  it("treats iPadOS-as-Mac as Apple mobile, but not a desktop Mac", () => {
    expect(isAppleMobile({ navigator: ipadAsMac as unknown as Navigator })).toBe(true);
    expect(isAppleMobile({ navigator: desktopMac as unknown as Navigator })).toBe(false);
  });

  it("does not trust a vibrate stub on iOS", () => {
    expect(caps({ ...iphone, vibrate: fn }).vibration).toBe(false);
  });

  it("reports missing APIs", () => {
    expect(caps({ userAgent: "", platform: "" })).toMatchObject({ wakeLock: false, mediaSession: false, share: false, vibration: false });
  });
});
