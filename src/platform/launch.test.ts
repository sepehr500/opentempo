import { describe, expect, it } from "vitest";
import { tabFromUrl } from "./launch";

describe("launch tab", () => {
  it("reads the tab a shortcut asks for", () => {
    expect(tabFromUrl("https://opentempo.app/?tab=presets")).toBe("presets");
    expect(tabFromUrl("/?tab=voice")).toBe("voice");
  });

  it("ignores anything else", () => {
    expect(tabFromUrl("https://opentempo.app/")).toBe(null);
    expect(tabFromUrl("/?tab=settings")).toBe(null);
    expect(tabFromUrl("/?tab=")).toBe(null);
  });
});
