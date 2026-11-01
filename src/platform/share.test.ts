import { describe, expect, it } from "vitest";
import { shareApp, shareData, shareToast } from "./share";

const data = shareData("https://opentempo.app");
const clip = () => {
  const out: string[] = [];
  return { out, clipboard: { writeText: async (s: string) => void out.push(s) } };
};
const abort = () => Object.assign(new Error("dismissed"), { name: "AbortError" });

describe("share the app", () => {
  it("uses the share sheet when there is one", async () => {
    const got: ShareData[] = [];
    expect(await shareApp({ share: async (d) => void got.push(d) }, data)).toBe("shared");
    expect(got[0]).toEqual({ title: "tempo", text: "A pocket metronome.", url: "https://opentempo.app/" });
  });

  it("treats dismissing the sheet as a choice, and copies nothing", async () => {
    const c = clip();
    expect(await shareApp({ share: async () => { throw abort(); }, ...c }, data)).toBe("cancelled");
    expect(c.out).toEqual([]);
  });

  it("copies the link when there is no share sheet, or it fails", async () => {
    const a = clip();
    expect(await shareApp({ ...a }, data)).toBe("copied");
    expect(a.out).toEqual(["https://opentempo.app/"]);
    const b = clip();
    expect(await shareApp({ share: async () => { throw new Error("NotAllowedError"); }, ...b }, data)).toBe("copied");
    const c = clip();
    expect(await shareApp({ share: async () => {}, canShare: () => false, ...c }, data)).toBe("copied");
  });

  it("fails cleanly when nothing works, and the toast shows the address instead", async () => {
    expect(await shareApp({ clipboard: { writeText: async () => { throw new Error("denied"); } } }, data)).toBe("failed");
    expect(await shareApp({}, data)).toBe("failed");
    expect(shareToast("failed", "https://opentempo.app/")).toBe("opentempo.app");
    expect(shareToast("copied", "https://opentempo.app/")).toBe("link copied");
    expect(shareToast("shared", "x")).toBe(null);
    expect(shareToast("cancelled", "x")).toBe(null);
  });
});
