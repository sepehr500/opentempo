import { describe, expect, it } from "vitest";
import { addSong, decodeSet, encodeSet, isSongEnd, moveSong, removeSong, step, updateSong, type SetList, type Song } from "./sets";

const song = (id: string, over: Partial<Song> = {}): Song => ({ id, name: id, bpm: 100, beatsPerBar: 4, subdivision: 1, voice: "wood", bars: null, ...over });
const set: SetList = { id: "s", name: "friday", songs: [song("a"), song("b"), song("c")] };
const names = (s: SetList) => s.songs.map((x) => x.id).join("");

describe("set operations", () => {
  it("add, remove, update", () => {
    expect(names(addSong(set, song("d")))).toBe("abcd");
    expect(names(removeSong(set, "b"))).toBe("ac");
    expect(updateSong(set, "b", { bpm: 140 }).songs[1].bpm).toBe(140);
  });

  it("moves with clamping and leaves the original untouched", () => {
    expect(names(moveSong(set, "a", 1))).toBe("bac");
    expect(names(moveSong(set, "a", 10))).toBe("bca");
    expect(names(moveSong(set, "c", -10))).toBe("cab");
    expect(names(set)).toBe("abc");
  });

  it("steps without wrapping", () => {
    expect([step(set, 0, 1), step(set, 2, 1), step(set, 0, -1)]).toEqual([1, null, null]);
  });

  it("detects the last beat of a song", () => {
    const s = song("x", { bars: 8 });
    expect(isSongEnd(s, 7, 3, 4)).toBe(true);
    expect(isSongEnd(s, 7, 2, 4)).toBe(false);
    expect(isSongEnd(song("open"), 7, 3, 4)).toBe(false);
  });
});

describe("sharing", () => {
  it("round-trips a set (with unicode) through a URL-safe code", () => {
    const s: SetList = { ...set, name: "café set", songs: [song("a", { name: "glass city", bpm: 96, bars: 64 }), song("b", { subdivision: 3 })] };
    const code = encodeSet(s);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = decodeSet(code)!;
    expect(back.name).toBe("café set");
    expect(back.songs.map((x) => [x.name, x.bpm, x.bars, x.subdivision])).toEqual([
      ["glass city", 96, 64, 1],
      ["b", 100, null, 3],
    ]);
  });

  it("rejects garbage and clamps out-of-range values", () => {
    expect(decodeSet("not-a-set")).toBeNull();
    const evil = btoa(JSON.stringify({ v: 1, n: "x", s: [["y", 9999, 99, 7, "wood", -3]] }));
    expect(decodeSet(evil)!.songs[0]).toMatchObject({ bpm: 300, beatsPerBar: 12, subdivision: 1, bars: null });
  });
});
