import { describe, expect, it } from "vitest";
import { appleVersion, detect, isAppleMobile } from "./capabilities";

const fn = () => true;
const android = { userAgent: "Mozilla/5.0 (Linux; Android 15) Chrome/140", platform: "Linux armv8l", maxTouchPoints: 5, vibrate: fn, wakeLock: {}, mediaSession: {} };
const iphone = { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5, wakeLock: {}, mediaSession: {} };
const ipadAsMac = { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", platform: "MacIntel", maxTouchPoints: 5, wakeLock: {}, mediaSession: {} };
const desktopMac = { ...ipadAsMac, maxTouchPoints: 0 };

const caps = (n: object) => detect({ navigator: n as Navigator });

describe("capabilities", () => {
  it("Android has everything", () => {
    expect(caps(android)).toEqual({ vibration: true, wakeLock: true, mediaSession: true, lockedPlayback: true });
  });

  it("iPhone has no vibration and no locked playback", () => {
    expect(caps(iphone)).toMatchObject({ vibration: false, lockedPlayback: false, wakeLock: true });
  });

  it("iOS 17.5+ keeps playing locked once it has an audio session", () => {
    const safari = (v: string) => ({ ...iphone, userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) Version/${v} Mobile/15E148 Safari/604.1`, audioSession: {} });
    expect(caps(safari("17.4")).lockedPlayback).toBe(false);
    expect(caps(safari("17.5")).lockedPlayback).toBe(true);
    expect(caps(safari("26.0")).lockedPlayback).toBe(true);
    const { audioSession: _, ...noSession } = safari("26.0");
    expect(caps(noSession).lockedPlayback).toBe(false);
    expect(caps({ ...ipadAsMac, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.2 Safari/605.1.15", audioSession: {} }).lockedPlayback).toBe(true);
  });

  it("reads the WebKit version from Safari or from the OS in other iOS browsers", () => {
    expect(appleVersion("(iPhone; CPU iPhone OS 18_6 like Mac OS X) Version/26.1 Mobile")).toBe(2601);
    expect(appleVersion("(iPhone; CPU iPhone OS 17_5 like Mac OS X) CriOS/140.0 Mobile")).toBe(1705);
    expect(appleVersion("Mozilla/5.0")).toBeNull();
  });

  it("treats iPadOS-as-Mac as Apple mobile, but not a desktop Mac", () => {
    expect(isAppleMobile({ navigator: ipadAsMac as unknown as Navigator })).toBe(true);
    expect(isAppleMobile({ navigator: desktopMac as unknown as Navigator })).toBe(false);
  });

  it("does not trust a vibrate stub on iOS", () => {
    expect(caps({ ...iphone, vibrate: fn }).vibration).toBe(false);
  });

  it("reports missing APIs", () => {
    expect(caps({ userAgent: "", platform: "" })).toMatchObject({ wakeLock: false, mediaSession: false, vibration: false });
  });
});
