// Setlists as plain data plus pure operations. Persisted with prefs; shared as a URL.
import type { Subdivision } from "./types";

export type Song = {
  readonly id: string;
  readonly name: string;
  readonly bpm: number;
  readonly beatsPerBar: number;
  readonly subdivision: Subdivision;
  readonly voice: string;
  /** Length in bars; with auto-next on, the set advances after this many bars. null = open-ended. */
  readonly bars: number | null;
};

export type SetList = {
  readonly id: string;
  readonly name: string;
  readonly songs: readonly Song[];
};

export const newId = (): string => Math.random().toString(36).slice(2, 10);

export const addSong = (set: SetList, song: Song): SetList => ({ ...set, songs: [...set.songs, song] });

export const removeSong = (set: SetList, id: string): SetList => ({ ...set, songs: set.songs.filter((s) => s.id !== id) });

export const updateSong = (set: SetList, id: string, patch: Partial<Omit<Song, "id">>): SetList => ({
  ...set,
  songs: set.songs.map((s) => (s.id === id ? { ...s, ...patch } : s)),
});

/** Move a song by `delta` positions, clamped to the list. */
export const moveSong = (set: SetList, id: string, delta: number): SetList => {
  const from = set.songs.findIndex((s) => s.id === id);
  if (from < 0) return set;
  const to = Math.max(0, Math.min(set.songs.length - 1, from + delta));
  const songs = [...set.songs];
  const [song] = songs.splice(from, 1);
  songs.splice(to, 0, song);
  return { ...set, songs };
};

/** Index after stepping by delta; null past either end (no wrap: a set has an end). */
export const step = (set: SetList, index: number, delta: number): number | null => {
  const next = index + delta;
  return next >= 0 && next < set.songs.length ? next : null;
};

/** Auto-next: true when the click at musical bar `bar` (0-based) is the last beat of the song's last bar. */
export const isSongEnd = (song: Song | undefined, bar: number, beat: number, beatsPerBar: number): boolean =>
  !!song?.bars && bar === song.bars - 1 && beat === beatsPerBar - 1;

// ── sharing: compact, URL-safe, versioned ─────────────────────────────
type Wire = { v: 1; n: string; s: Array<[string, number, number, number, string, number]> };

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));

export const encodeSet = (set: SetList): string =>
  b64url(JSON.stringify({ v: 1, n: set.name, s: set.songs.map((x) => [x.name, x.bpm, x.beatsPerBar, x.subdivision, x.voice, x.bars ?? 0]) } satisfies Wire));

/** Inverse of encodeSet with validation; null on anything malformed. Fresh ids are assigned. */
export const decodeSet = (code: string): SetList | null => {
  try {
    const w = JSON.parse(unb64url(code)) as Wire;
    if (w.v !== 1 || typeof w.n !== "string" || !Array.isArray(w.s)) return null;
    const songs = w.s.map(([name, bpm, beatsPerBar, subdivision, voice, bars]): Song => {
      if (typeof name !== "string" || ![bpm, beatsPerBar, subdivision, bars].every(Number.isFinite)) throw new Error("bad song");
      return {
        id: newId(),
        name: name.slice(0, 40),
        bpm: Math.min(300, Math.max(20, Math.round(bpm))),
        beatsPerBar: Math.min(12, Math.max(1, Math.round(beatsPerBar))),
        subdivision: ([1, 2, 3, 4].includes(subdivision) ? subdivision : 1) as Subdivision,
        voice: String(voice),
        bars: bars > 0 ? Math.round(bars) : null,
      };
    });
    return { id: newId(), name: w.n.slice(0, 40), songs };
  } catch {
    return null;
  }
};
