# Third-party notices

tempo itself is MIT licensed (see [LICENSE](LICENSE)). It builds on the work below.

## Shipped in the app

These end up in `dist/` and are served to (and cached by) every visitor.

| Component | Used for | Licence | Copyright |
| --- | --- | --- | --- |
| [Solid](https://github.com/solidjs/solid) (`solid-js`) | UI runtime | MIT | © 2016-2025 Ryan Carniato |
| [idb-keyval](https://github.com/jakearchibald/idb-keyval) | on-device storage | Apache-2.0 | © 2016 Jake Archibald |
| [Workbox](https://github.com/GoogleChrome/workbox) (via `vite-plugin-pwa`) | service worker / offline cache | MIT | © 2018 Google LLC |
| [Space Grotesk](https://github.com/floriankarsten/space-grotesk) (via `@fontsource-variable/space-grotesk`) | UI typeface | SIL OFL 1.1 | © 2020 The Space Grotesk Project Authors |
| [Space Mono](https://github.com/googlefonts/spacemono) (via `@fontsource/space-mono`) | monospace typeface | SIL OFL 1.1 | © 2016 The Space Mono Project Authors |

`npm run build` also writes `dist/third-party-licenses.md` with the full licence text of every
JavaScript dependency bundled into the app. The shipped font files keep their copyright and
licence URL in their own metadata.

## Committed to this repository

- `scripts/SpaceGrotesk.ttf`: Space Grotesk (variable, v2.000), unmodified, used only by
  `scripts/glyphs.py` to draw the dot-matrix glyphs. Licensed under the SIL Open Font License 1.1;
  the full text is in [`scripts/SpaceGrotesk-OFL.txt`](scripts/SpaceGrotesk-OFL.txt).
- `src/ui/glyphs.json`: dot-matrix bitmaps rasterised from that font by `scripts/glyphs.py`.

## Credits

- **Colours**: the accent palette is combination #294 from Sanzo Wada's
  *A Dictionary of Color Combinations* (Sulpher Yellow `#F5ECC2`, Cream Yellow `#FDBF68`,
  Cossack Green `#437742`, Salvia Blue `#97ACC8`), taken from Matt DesLauriers' open dataset
  [dictionary-of-colour-combinations](https://github.com/mattdesl/dictionary-of-colour-combinations)
  (MIT). Only the four hex values are used.
- **Icons**: drawn by hand for this project (`src/ui/icons.tsx`, `public/icon.svg`).
- **Sounds**: synthesised at runtime with Web Audio (`src/audio/voices.ts`); no samples.

## Development-only tooling

Build and test tools (Vite, Vitest, TypeScript, vite-plugin-solid, vite-plugin-pwa and their
dependencies) are not shipped. They are under permissive licences (mostly MIT, ISC, Apache-2.0,
BSD, BlueOak-1.0.0), plus MPL-2.0 for `lightningcss` and CC-BY-4.0 for `caniuse-lite` data.
Run `npx license-checker-rseidelsohn --summary` for the current list.
