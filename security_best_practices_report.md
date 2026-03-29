<!-- Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms. -->
# Security Best Practices Report

## Executive Summary

This repository is a public static frontend application with no server-side secret handling in scope. I did **not** find committed API keys, tokens, private keys, or `.env` leaks in the tracked files. The main risks are instead concentrated in frontend supply-chain trust and browser hardening gaps: the app executes third-party JavaScript directly from a CDN, the repository does not codify CSP or other response headers, and visitor metadata is leaked to Google Fonts on every page load.

## High Severity

### AG-SEC-001

- Severity: High
- Location: `index.html:19-25`
- Evidence:

```html
<link
  rel="preconnect"
  href="https://cdn.plot.ly"
>
<script
  src="https://cdn.plot.ly/plotly-2.32.0.min.js"
  defer
></script>
```

- Impact: if the external Plotly CDN asset or the network path to it is compromised, arbitrary JavaScript will execute in the origin of your production site and can read or alter all browser-accessible state.
- Fix: stop executing Plotly from a remote CDN at runtime. Prefer bundling Plotly through npm/Vite or self-hosting a pinned local asset. If you must keep the CDN path, add Subresource Integrity and pair it with a strict CSP.
- Mitigation: add a restrictive CSP and self-host other third-party assets to reduce total trust in remote origins.
- False positive notes: this is not theoretical frontend noise. The code really does execute third-party JavaScript before the app boots.

## Medium Severity

### AG-SEC-002

- Severity: Medium
- Location: `index.html:1-30`, repo root (no `_headers` file checked in)
- Evidence:
  - `index.html` contains no CSP meta tag before external script execution.
  - The repository does not contain a Cloudflare Pages `_headers` file or equivalent checked-in header policy.
- Impact: the deployed site has no visible, version-controlled browser hardening policy. That increases blast radius for any future XSS, dependency compromise, clickjacking exposure, and unnecessary referrer or feature access.
- Fix: add a checked-in `_headers` file for Cloudflare Pages and set at least:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy`
  - `X-Frame-Options` or `frame-ancestors` via CSP
- Mitigation: if headers are already configured manually in the Cloudflare dashboard, move them into repo-managed config so the security posture is reviewable and reproducible.
- False positive notes: headers could exist in Cloudflare dashboard today, but they are not visible in code, so they are not auditable from the repo.

## Low Severity

### AG-SEC-003

- Severity: Low
- Location: `src/styles/main.css:2`
- Evidence:

```css
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap");
```

- Impact: every visitor leaks request metadata to Google Fonts, and the site depends on another third-party origin for presentation-critical resources.
- Fix: self-host the fonts or vendor them through local assets / `@fontsource` so the production page can render without reaching out to Google.
- Mitigation: if you intentionally accept this privacy tradeoff, document it explicitly in the repo and privacy materials.
- False positive notes: this is a privacy and information-leakage concern, not a remote code execution issue.

### AG-SEC-004

- Severity: Low
- Location: `package.json:5-10`
- Evidence:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "deploy": "wrangler pages deploy dist --project-name allgreeks --branch main"
}
```

- Impact: production can be deployed from an uncommitted local working tree, which weakens release provenance and makes it possible for the live site to diverge from the code that reviewers see on GitHub.
- Fix: prefer commit-and-push-based production deploys, or enforce CI-only deploys from GitHub so the live site always corresponds to an auditable revision.
- Mitigation: if manual local deploys remain necessary, require a release checklist that captures git SHA, dirty state, and deployment ID.
- False positive notes: this is an integrity/release-control risk rather than an exploit in application logic.

## Additional Notes

- `localStorage` usage in `src/utils/SnapshotManager.js` stores only model parameters and UI state; I did not find sensitive data being persisted there.
- `innerHTML` is used in `src/ui/AppShell.js` and `src/ui/ErrorHandler.js`, but the current strings are constant and not fed from attacker-controlled data, so I am **not** flagging them as active XSS findings at this time.
- External links in `src/ui/AppShell.js` correctly use `rel="noreferrer"` with `target="_blank"`.
