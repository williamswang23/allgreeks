// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

import "../styles/main.css";
import logoPath from "../../assets/WWR_logo_reverse_white_transparent.png";
import {
  HERO_FACTS,
  INFO_CARDS,
  LEVEL1_SPECS,
  LEVEL2_SPECS,
  SELF_CHECK_SPECS,
  VIEW_CONFIGS,
} from "../config/dashboardConfig.js";

function buildSurfaceCardsMarkup(specs) {
  return specs
    .map(
      (spec) => `
    <article class="surface-card">
      <div class="surface-card__meta">
        <div>
          <p class="surface-card__label">${spec.title}</p>
          <p class="surface-card__description">${spec.description}</p>
        </div>
        <div class="surface-card__badges">
          <span class="surface-badge">${spec.colorScale}</span>
          <span class="surface-badge">${spec.zAxisLabel}</span>
        </div>
      </div>
      <div class="surface-card__toolbar">
        <div class="camera-group">
          <button type="button" class="camera-button is-active" data-camera-target="${spec.id}" data-camera-mode="perspective">Perspective</button>
          <button type="button" class="camera-button" data-camera-target="${spec.id}" data-camera-mode="top">Top</button>
          <button type="button" class="camera-button" data-camera-target="${spec.id}" data-camera-mode="side">Side</button>
        </div>
        <button type="button" class="ghost-button" data-camera-reset="${spec.id}">Reset View</button>
      </div>
      <div class="plot-shell">
        <div class="plot-surface" id="${spec.containerId}"></div>
      </div>
      <div class="surface-card__footer">
        <span>${spec.zAxisLabel} range</span>
        <span id="range-${spec.id}">Waiting for render...</span>
      </div>
    </article>
  `,
    )
    .join("");
}

function buildCheckCardsMarkup() {
  return SELF_CHECK_SPECS.map(
    (spec) => `
    <article class="check-card">
      <div class="check-card__header">
        <div>
          <span class="eyebrow">Cross-check</span>
          <h3>${spec.title}</h3>
        </div>
      </div>
      <p>${spec.description}</p>
      <div class="check-card__plot" id="${spec.containerId}"></div>
    </article>
  `,
  ).join("");
}

/**
 * 渲染应用壳层
 *
 * @param {HTMLElement} root 根容器
 */
export function renderAppShell(root) {
  root.innerHTML = `
    <div class="app-shell">
      <header class="site-header">
        <div class="brand-lockup">
          <div class="brand-mark">
            <img class="brand-logo" src="${logoPath}" alt="Williams Wang Research">
          </div>
          <div class="brand-copy">
            <span class="eyebrow">Advanced BSM visualization board</span>
            <h1>AllGreeks Explorer</h1>
          </div>
        </div>

        <nav class="site-nav" aria-label="Primary">
          ${VIEW_CONFIGS.map(
            (view) => `
            <button type="button" class="nav-link ${view.id === "overview" ? "is-active" : ""}" data-view="${view.id}">
              ${view.label}
            </button>
          `,
          ).join("")}
        </nav>

        <div class="header-meta">
          <a href="https://x.com/williamswjt" target="_blank" rel="noreferrer">X @williamswjt</a>
          <button type="button" class="mobile-controls-button" id="open-mobile-controls">Controls</button>
        </div>
      </header>

      <div class="app-body">
        <aside class="sidebar" id="sidebar">
          <div class="parameter-panel" id="controls">
            <div class="panel-head">
              <div>
                <span class="eyebrow">Model controls</span>
                <h2>Single-session assumptions</h2>
              </div>
              <button type="button" class="panel-close" id="close-mobile-controls">Close</button>
            </div>

            <section class="panel-section">
              <p class="panel-section-title">Rates & volatility</p>
              <div class="control-stack">
                <label class="control-group" for="s0">
                  <span class="control-label">
                    <span>Spot Reference</span>
                    <span class="control-unit">Manual input</span>
                  </span>
                  <div class="number-input-shell">
                    <input class="number-input" id="s0" type="number" min="100" max="1000" step="1" value="500" inputmode="decimal">
                  </div>
                </label>

                <label class="control-group" for="sigma">
                  <span class="control-label">
                    <span>Base Volatility</span>
                    <span class="control-unit">Percent</span>
                  </span>
                  <div class="number-input-shell">
                    <input class="number-input" id="sigma" type="number" min="10" max="40" step="0.5" value="20" inputmode="decimal">
                    <span class="number-input-suffix">%</span>
                  </div>
                </label>

                <label class="control-group" for="r">
                  <span class="control-label">
                    <span>Risk-free Rate</span>
                    <span class="control-unit">Percent</span>
                  </span>
                  <div class="number-input-shell">
                    <input class="number-input" id="r" type="number" min="0" max="6" step="0.1" value="4" inputmode="decimal">
                    <span class="number-input-suffix">%</span>
                  </div>
                </label>

                <label class="control-group" for="q">
                  <span class="control-label">
                    <span>Dividend Yield</span>
                    <span class="control-unit">Percent</span>
                  </span>
                  <div class="number-input-shell">
                    <input class="number-input" id="q" type="number" min="0" max="3" step="0.1" value="1.5" inputmode="decimal">
                    <span class="number-input-suffix">%</span>
                  </div>
                </label>
              </div>
            </section>

            <section class="panel-section">
              <p class="panel-section-title">Display & scenario</p>
              <div class="control-stack">
                <label class="control-group" for="preset">
                  <span class="control-label">
                    <span>Term Structure Preset</span>
                  </span>
                  <select class="select-input" id="preset">
                    <option value="normal" selected>Normal (upward)</option>
                    <option value="shock">Shock (inverted)</option>
                  </select>
                </label>

                <label class="control-group" for="theme">
                  <span class="control-label">
                    <span>Theme</span>
                  </span>
                  <select class="select-input" id="theme">
                    <option value="dark" selected>Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>

                <div class="toggle-row">
                  <label class="toggle-control" for="zlock">
                    <span class="toggle-copy">
                      <strong>Lock z-range</strong>
                      <span>Keep each card on a stable scale for comparison.</span>
                    </span>
                    <input id="zlock" type="checkbox">
                  </label>

                  <label class="toggle-control" for="market_flavor">
                    <span class="toggle-copy">
                      <strong>SVI market flavor</strong>
                      <span>Swap flat sigma for an SVI-like smile surface.</span>
                    </span>
                    <input id="market_flavor" type="checkbox">
                  </label>
                </div>
              </div>
            </section>

            <section class="panel-section">
              <p class="panel-section-title">Actions</p>
              <div class="action-stack">
                <button type="button" class="action-button" id="btn_export_png">Export Visible PNG</button>
                <button type="button" class="action-button" id="btn_copy_json">Copy JSON</button>
                <button type="button" class="action-button" id="btn_save_snapshot">Save Snapshot</button>
                <button type="button" class="action-button" id="btn_share_link">Share Link</button>
                <button type="button" class="action-button" id="btn_reset_view">Reset Views</button>
                <button type="button" class="action-button" id="btn_assumptions">Assumptions</button>
              </div>
            </section>

            <section class="panel-section panel-section--footer">
              <span class="status-chip" id="render-status">Waiting for first render...</span>
              <span class="worker-chip" id="worker-status">Checking worker...</span>
            </section>
          </div>
        </aside>

        <main class="content-panel">
          <section class="view-section is-active" data-view-panel="overview">
            <div class="page-stack">
              <section class="hero-panel">
                <div class="hero-copy">
                  <span class="eyebrow">Quant research board</span>
                  <h2>Read the entire Greek stack with one visual language.</h2>
                  <p>
                    This board keeps the original analytical engine and advanced features intact,
                    while organizing the full Greek stack into a cleaner workflow with unified
                    controls, concise interpretation, and one consistent card system for every
                    surface.
                  </p>
                  <div class="hero-actions">
                    <button type="button" class="primary-link" data-view="level1">Open Level 1</button>
                    <button type="button" class="secondary-link" data-view="level2">Open Level 2</button>
                  </div>
                </div>
                <div class="hero-facts">
                  ${HERO_FACTS.map(
                    (fact) => `
                    <div class="hero-fact">
                      <span>${fact.label}</span>
                      <strong>${fact.value}</strong>
                    </div>
                  `,
                  ).join("")}
                </div>
              </section>

              <section class="info-grid">
                ${INFO_CARDS.map(
                  (card) => `
                  <article class="info-card">
                    <span class="eyebrow">${card.eyebrow}</span>
                    <h3>${card.title}</h3>
                    <p>${card.body}</p>
                  </article>
                `,
                ).join("")}
              </section>

              <section class="check-grid">
                ${buildCheckCardsMarkup()}
              </section>
            </div>
          </section>

          <section class="view-section" data-view-panel="level1">
            <div class="page-stack">
              <section class="page-intro">
                <span class="eyebrow">First-pass sensitivities</span>
                <h2>Level 1 surfaces</h2>
                <p>
                  Directional exposure, convexity, volatility sensitivity, and time decay are kept together
                  here so you can read the baseline geometry before moving into higher-order couplings.
                </p>
              </section>

              <section class="surface-grid">
                ${buildSurfaceCardsMarkup(LEVEL1_SPECS)}
              </section>
            </div>
          </section>

          <section class="view-section" data-view-panel="level2">
            <div class="page-stack">
              <section class="page-intro">
                <span class="eyebrow">Coupled and higher-order risk</span>
                <h2>Level 2 surfaces</h2>
                <p>
                  These cards focus on cross-derivatives and curvature effects that become visually useful only
                  once the surrounding UI gives them enough explanatory structure.
                </p>
              </section>

              <section class="surface-grid">
                ${buildSurfaceCardsMarkup(LEVEL2_SPECS)}
              </section>
            </div>
          </section>
        </main>
      </div>

      <footer class="site-footer">
        <div><strong>Copyright © 2026 Williams.Wang.</strong> All rights reserved.</div>
        <div>Cloudflare Pages delivery with analytical BSM + SVI visualization.</div>
      </footer>
    </div>

    <div id="assumptions_modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="assumptions_title">
      <div class="modal-backdrop" id="assumptions_backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="assumptions_title">Model assumptions & scope</h2>
          <button id="assumptions_close" class="ghost-button" type="button" aria-label="Close assumptions">Close</button>
        </div>
        <div class="modal-body">
          <ul>
            <li><strong>Framework:</strong> Black-Scholes-Merton under European exercise assumptions.</li>
            <li><strong>Rates and carry:</strong> Constant risk-free rate and continuous dividend yield across the surface.</li>
            <li><strong>Volatility modes:</strong> Teaching mode uses a simple preset term structure; market flavor uses an SVI-like smile surface.</li>
            <li><strong>Numerics:</strong> Stability clamps enforce T ≥ 0.02, sigma ≥ 0.05, and |d| ≤ 8 before evaluation.</li>
            <li><strong>Purpose:</strong> Educational and analytical visualization only. No live market data or execution layer is included.</li>
          </ul>
        </div>
        <div class="modal-footer">
          <button id="assumptions_ok" class="modal-primary" type="button">OK</button>
        </div>
      </div>
    </div>
  `;
}
