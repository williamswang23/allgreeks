<!-- Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms. -->
# AllGreeks Explorer

Advanced Black-Scholes-Merton Greek surface explorer with first-order and higher-order 3D boards, teaching presets, SVI-style market flavor, snapshot sharing, and Cloudflare-ready static deployment.

## What I Found About The Existing Deployment

- The current `allgreeks` repository only contained static HTML, CSS, and ES modules.
- There was no `wrangler.toml`, no `package.json`, no GitHub Actions workflow, and no deploy script in the repo history.
- After querying your live Cloudflare account, the exact deployment is now confirmed:
  - Product: Cloudflare Pages
  - Project name: `allgreeks`
  - Connected Git provider: Yes
  - Production branch: `main`
  - Production domains: `allgreeks.pages.dev`, `allgreeks.williamswang.win`
  - Most recent production deployment found: commit `d4e3599`
- This means your earlier memory of "Worker" was close in platform family but not exact. The live site is a Pages project backed by the GitHub repository.

This refactor fixes the local ambiguity by adding an explicit local build path and a manual Pages deploy command:

- Vite builds the app into `dist/`
- `wrangler pages deploy dist --project-name allgreeks --branch main` can publish the static bundle manually
- The existing production Pages project can still auto-build from GitHub on pushes to `main`

## Refactor Direction

The new shell is intentionally aligned with the visual language of `0dte_greeks`:

- same dark quant dashboard palette
- stronger card hierarchy and typography
- persistent parameter sidebar
- content views split into Overview / Level 1 / Level 2
- config-driven surface metadata instead of hardcoded per-card copy in the page

The analytical engine, SVI support, snapshots, sharing, numerical validation, and Worker acceleration remain in place.

## Stack

- Native ES modules
- Vite for local dev and production build
- Plotly.js (CDN) for WebGL surface rendering
- Cloudflare Pages with GitHub integration

## Local Development

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Production Build

```bash
npm run build
npm run preview
```

## Manual Cloudflare Pages Deploy

```bash
npx wrangler login
npm run build
npm run deploy
```

## Automatic Production Deploy

The existing Cloudflare Pages project is already linked to GitHub and tracks `main`.

That means the primary production path is:

1. push to `main`
2. Cloudflare Pages pulls from GitHub
3. Pages rebuilds and republishes `allgreeks.williamswang.win`

## Project Structure

```text
allgreeks/
├── index.html
├── package.json
├── src/
│   ├── app.js
│   ├── config/dashboardConfig.js
│   ├── grid/
│   ├── model/
│   ├── render/
│   ├── styles/main.css
│   ├── ui/
│   ├── utils/
│   ├── validation/
│   └── workers/
└── vite.config.js
```

## Notes

- The Worker pipeline now consumes the full `sigmaGrid`, so SVI mode stays numerically consistent even when parallel computation is enabled.
- PNG export currently targets only the plots that are visible in the active view, which matches the new view-based layout.
- Share links still use URL hash encoding, so there is no server-side state requirement.
