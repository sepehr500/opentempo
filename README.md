# tempo

A pocket metronome PWA. SolidJS + Vite, Web Audio, offline-first.

```sh
npm install
npm run dev      # http://localhost:5173 (also on your LAN)
npm test         # pure timing core
npm run build    # typecheck + production build + service worker
```

## Layout

- `src/core/`: pure functions. Covers the timeline (tempo, accents, subdivisions, count-in,
  gap trainer, random tempo, mid-play re-planning), tap tempo and tempo markings. Fully tested.
- `src/audio/`: the imperative shell. A lookahead scheduler on the audio clock, a
  worker ticker and synthesised voices (no samples).
- `src/platform/`: device adapters for Wake Lock, Vibration, Media Session and IndexedDB.
  Lock-screen controls need a playing media element, so a silent looping `<audio>` runs
  beside the click while it plays; the click itself never goes through it.
- `src/ui/`: Solid components for the dot-matrix display, knobs and icons.
- `src/styles/tokens.css`: the theme exported from Paper (see `scripts/sync-tokens.md`).
- `scripts/glyphs.py`: regenerates the dot-matrix digit glyphs from Space Grotesk.

## Testing on a phone

Service workers, Wake Lock and install require HTTPS (localhost is exempt).
Over plain LAN http the click works, but the PWA features won't. Use an HTTPS
tunnel to the dev server for full behaviour.
