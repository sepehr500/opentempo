import { describe, expect, it } from "vitest";
import { headerSlot } from "./header";

describe("header slot", () => {
  it("an update wins, then install, then share", () => {
    expect(headerSlot({ update: true, canInstall: true, installed: false })).toBe("update");
    expect(headerSlot({ update: true, canInstall: false, installed: true })).toBe("update");
    expect(headerSlot({ update: false, canInstall: true, installed: false })).toBe("install");
    expect(headerSlot({ update: false, canInstall: false, installed: true })).toBe("share");
    expect(headerSlot({ update: false, canInstall: false, installed: false })).toBe(null);
  });
});
