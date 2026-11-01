# Design tokens

`src/styles/tokens.css` is the source of truth in this repository: colours, fonts, radii and
spacing as CSS custom properties. To change the theme, edit that file directly.

It was first exported from the maintainer's design file in [Paper](https://paper.design)
(not public). For the maintainer, the round trip is: Paper `get_tokens` with
`namePattern "--d6s-*"` and `format "css"`, strip the `d6s-` prefix, and paste the result into
`src/styles/tokens.css`. Contributors don't need Paper; a pull request against `tokens.css` is
all it takes.

The accent colours (`#F5ECC2`, `#FDBF68`, `#437742`, `#97ACC8`) are combination #294 from
Sanzo Wada's *A Dictionary of Color Combinations*; see `THIRD_PARTY_NOTICES.md`.

Fonts are bundled from `@fontsource` packages (`src/styles/fonts.css`), so the app works offline.
