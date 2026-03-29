// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

export const VIEW_CONFIGS = [
  { id: "overview", label: "Overview" },
  { id: "level1", label: "Level 1" },
  { id: "level2", label: "Level 2" },
];

export const HERO_FACTS = [
  { label: "Framework", value: "BSM / European vanilla + SVI overlay" },
  { label: "Axes", value: "k = ln(K/F(T)) and time-to-expiry" },
  { label: "Delivery", value: "Cloudflare Pages linked to GitHub main" },
];

export const INFO_CARDS = [
  {
    eyebrow: "Why it matters",
    title: "This board is for comparing shape, not just reading isolated values.",
    body: "Shared styling and synchronized controls make it easier to see how first-order and higher-order Greeks deform together across strike and tenor.",
  },
  {
    eyebrow: "How to read",
    title: "Core teaching mode and market flavor mode are intentionally separated.",
    body: "Teaching presets keep the intuition simple, while SVI mode injects a realistic skew and term structure so the surfaces stop looking artificially flat.",
  },
  {
    eyebrow: "Deployment",
    title: "The live site is a Cloudflare Pages project wired to GitHub, not a Worker script.",
    body: "You now have local build tooling plus a manual Pages deploy command, while the existing production project remains linked to the repository's main branch.",
  },
];

const buildSurfaceSpec = ({
  id,
  title,
  description,
  group,
  colorScale,
  zAxisLabel = "value",
  defaultCamera = "perspective",
}) => ({
  id,
  title,
  description,
  group,
  colorScale,
  zAxisLabel,
  containerId: `surface-${id}`,
  defaultCamera,
});

export const LEVEL1_SPECS = [
  buildSurfaceSpec({
    id: "delta",
    title: "Delta (call) — dC / dS",
    description: "Primary directional sensitivity. This is the first surface to watch when you want to locate the ATM transition zone.",
    group: "level1",
    colorScale: "diverging",
    zAxisLabel: "Delta",
  }),
  buildSurfaceSpec({
    id: "gamma",
    title: "Gamma — d²C / dS²",
    description: "Convexity concentration. Gamma peaks near expiry and near ATM, which is why the local surface can become extremely sharp.",
    group: "level1",
    colorScale: "sequential",
    zAxisLabel: "Gamma",
  }),
  buildSurfaceSpec({
    id: "vega",
    title: "Vega — dC / dσ",
    description: "Volatility sensitivity. In the teaching setup this stays smooth, while SVI mode adds asymmetry through the smile.",
    group: "level1",
    colorScale: "sequential",
    zAxisLabel: "Vega",
  }),
  buildSurfaceSpec({
    id: "theta",
    title: "Theta — dC / dt (per year)",
    description: "Time decay surface. This makes the near-expiry compression visually obvious instead of hidden in a single scalar output.",
    group: "level1",
    colorScale: "diverging",
    zAxisLabel: "Theta",
  }),
];

export const LEVEL2_SPECS = [
  buildSurfaceSpec({
    id: "vanna",
    title: "Vanna — d²C / (dS dσ)",
    description: "Cross sensitivity between spot and volatility. Useful for seeing how skew exposure migrates across the grid.",
    group: "level2",
    colorScale: "diverging",
    zAxisLabel: "Vanna",
  }),
  buildSurfaceSpec({
    id: "charm",
    title: "Charm — dDelta / dt",
    description: "Delta drift through time. This surface is one of the cleanest ways to explain why delta can move before spot moves.",
    group: "level2",
    colorScale: "diverging",
    zAxisLabel: "Charm",
  }),
  buildSurfaceSpec({
    id: "vomma",
    title: "Vomma (Volga) — dVega / dσ",
    description: "Curvature of vega with respect to volatility. It becomes more informative once market flavor is enabled.",
    group: "level2",
    colorScale: "diverging",
    zAxisLabel: "Vomma",
  }),
  buildSurfaceSpec({
    id: "speed",
    title: "Speed — dGamma / dS",
    description: "How quickly gamma itself moves across the spot axis. This is where local instability becomes easiest to see.",
    group: "level2",
    colorScale: "diverging",
    zAxisLabel: "Speed",
  }),
  buildSurfaceSpec({
    id: "zomma",
    title: "Zomma — dGamma / dσ",
    description: "Gamma sensitivity to volatility changes. It is useful for understanding how convexity reacts when skew shifts.",
    group: "level2",
    colorScale: "diverging",
    zAxisLabel: "Zomma",
  }),
  buildSurfaceSpec({
    id: "veta",
    title: "Veta — dVega / dt",
    description: "Time decay of vega. This highlights where volatility exposure collapses fastest as expiry approaches.",
    group: "level2",
    colorScale: "diverging",
    zAxisLabel: "Veta",
  }),
];

export const SELF_CHECK_SPECS = [
  {
    id: "term",
    title: "Term Structure Cross-check",
    description: "A compact overview of ATM volatility across tenor under teaching presets or the SVI market-flavor overlay.",
    containerId: "selfcheck-term",
  },
  {
    id: "smile",
    title: "Smile Slice Cross-check",
    description: "A fixed-tenor slice that lets you verify whether the smile stays flat in teaching mode or bends under SVI.",
    containerId: "selfcheck-smile",
  },
];

export const SURFACE_GROUPS = {
  level1: LEVEL1_SPECS,
  level2: LEVEL2_SPECS,
};

export const ALL_SURFACE_SPECS = [...LEVEL1_SPECS, ...LEVEL2_SPECS];

export const SURFACE_EXPORT_IDS = [
  ...ALL_SURFACE_SPECS.map((spec) => spec.containerId),
  ...SELF_CHECK_SPECS.map((spec) => spec.containerId),
];
