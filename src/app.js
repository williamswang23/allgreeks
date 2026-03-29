// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：应用入口，负责组装页面壳层、参数控制、曲面计算与渲染流程。
import { MathUtils } from "./utils/MathUtils.js";
import { BlackScholesModel, GreeksEngine } from "./model/BlackScholesModel.js";
import { SVIModel } from "./model/SVIModel.js";
import { GridGenerator } from "./grid/GridGenerator.js";
import { PlotlyRenderer } from "./render/PlotlyRenderer.js";
import { UIController } from "./ui/Controls.js";
import { ErrorHandler } from "./ui/ErrorHandler.js";
import { renderAppShell } from "./ui/AppShell.js";
import { WorkerManager } from "./workers/WorkerManager.js";
import { NumericalValidator } from "./validation/NumericalValidator.js";
import { SnapshotManager } from "./utils/SnapshotManager.js";
import { ALL_SURFACE_SPECS, SELF_CHECK_SPECS, SURFACE_GROUPS } from "./config/dashboardConfig.js";

class App {
  /**
   * @param {HTMLElement} root 应用根容器
   */
  constructor(root) {
    this.root = root;
    this.state = {
      s0: 500,
      sigma: 0.2,
      r: 0.04,
      q: 0.015,
      preset: "normal",
      theme: "dark",
      zlock: false,
      marketFlavor: false,
      kMin: -1.0,
      kMax: 1.0,
      tMin: 0.02,
      tMax: 2.0,
      resHigh: { nk: 121, nt: 60 },
      resLow: { nk: 61, nt: 30 },
    };

    this.activeView = "overview";
    this.hasStarted = false;
    this.useWorker = false;
    this.cameraModes = Object.fromEntries(
      ALL_SURFACE_SPECS.map((spec) => [spec.id, spec.defaultCamera]),
    );

    renderAppShell(this.root, this.state);

    this.model = new BlackScholesModel({ tMin: 0.02, sigmaMin: 0.05, maxAbsD: 8 });
    this.greeks = new GreeksEngine(this.model);
    this.svi = new SVIModel();
    this.grid = new GridGenerator();
    this.renderer = new PlotlyRenderer();
    this.ui = new UIController(document.getElementById("controls"), this.state);
    this.errorHandler = new ErrorHandler();
    this.worker = new WorkerManager();
    this.validator = new NumericalValidator();
    this.snapshots = new SnapshotManager();

    this._bindUI();
    this._initTheme();
    this._setStatus("Initializing explorer shell...");
  }

  /**
   * 初始化主题样式
   */
  _initTheme() {
    const isLight = this.state.theme === "light";
    document.body.classList.toggle("light", isLight);
    document.documentElement.dataset.theme = this.state.theme;
  }

  /**
   * 绑定 UI 控件与页面级事件
   */
  _bindUI() {
    this.ui.onChangeImmediate(() => {
      this._updateParamsFromUI();
      if (this.hasStarted) {
        this._renderCurrentView({ useLowRes: true });
      }
    });

    this.ui.onChangeSettled(() => {
      this._updateParamsFromUI();
      if (this.hasStarted) {
        this._renderCurrentView({ useLowRes: false });
      }
    });

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const { view } = button.dataset;
        if (!view || view === this.activeView) {
          return;
        }
        this._switchView(view);
      });
    });

    document.getElementById("open-mobile-controls")?.addEventListener("click", () => {
      this._toggleSidebar(true);
    });

    document.getElementById("close-mobile-controls")?.addEventListener("click", () => {
      this._toggleSidebar(false);
    });

    document.getElementById("btn_reset_view")?.addEventListener("click", () => {
      this.renderer.resetViews(this._getRenderableContainerIds());
      ALL_SURFACE_SPECS.forEach((spec) => {
        this.cameraModes[spec.id] = spec.defaultCamera;
      });
      this._syncCameraButtons();
    });

    document.getElementById("btn_export_png")?.addEventListener("click", async () => {
      await this._exportCurrentView();
    });

    document.getElementById("btn_copy_json")?.addEventListener("click", () => {
      const params = JSON.stringify(this.state, null, 2);
      navigator.clipboard.writeText(params).then(() => {
        this.errorHandler.showWarning("Parameter JSON copied to clipboard.", 2600);
      }).catch(() => {
        window.prompt("Copy this parameter JSON:", params);
      });
    });

    document.getElementById("btn_save_snapshot")?.addEventListener("click", () => {
      const name = window.prompt("Snapshot name (optional):");
      const snapshot = this.snapshots.saveSnapshot(this.state, name);
      this.errorHandler.showWarning(`Snapshot saved: ${snapshot.name}`, 3000);
    });

    document.getElementById("btn_share_link")?.addEventListener("click", () => {
      const shareLink = this.snapshots.generateShareLink(this.state);
      navigator.clipboard.writeText(shareLink).then(() => {
        this.errorHandler.showWarning("Share link copied to clipboard.", 2800);
      }).catch(() => {
        window.prompt("Copy this share link:", shareLink);
      });
    });

    document.getElementById("btn_assumptions")?.addEventListener("click", () => {
      this._setAssumptionsModalVisible(true);
    });

    document.getElementById("assumptions_close")?.addEventListener("click", () => {
      this._setAssumptionsModalVisible(false);
    });

    document.getElementById("assumptions_ok")?.addEventListener("click", () => {
      this._setAssumptionsModalVisible(false);
    });

    document.getElementById("assumptions_backdrop")?.addEventListener("click", () => {
      this._setAssumptionsModalVisible(false);
    });

    document.querySelectorAll("[data-camera-target]").forEach((button) => {
      button.addEventListener("click", () => {
        const { cameraTarget, cameraMode } = button.dataset;
        if (!cameraTarget || !cameraMode) {
          return;
        }
        this.cameraModes[cameraTarget] = cameraMode;
        this._syncCameraButtons();
        this.renderer.setCamera(cameraTarget, cameraMode);
      });
    });

    document.querySelectorAll("[data-camera-reset]").forEach((button) => {
      button.addEventListener("click", () => {
        const { cameraReset } = button.dataset;
        if (!cameraReset) {
          return;
        }
        const spec = ALL_SURFACE_SPECS.find((candidate) => candidate.id === cameraReset);
        if (!spec) {
          return;
        }
        this.cameraModes[cameraReset] = spec.defaultCamera;
        this._syncCameraButtons();
        this.renderer.setCamera(cameraReset, spec.defaultCamera);
      });
    });
  }

  /**
   * 设置 Assumptions 弹窗显隐
   *
   * @param {boolean} visible 是否显示
   */
  _setAssumptionsModalVisible(visible) {
    const modal = document.getElementById("assumptions_modal");
    if (!modal) {
      return;
    }
    modal.classList.toggle("hidden", !visible);
  }

  /**
   * 同步相机按钮状态
   */
  _syncCameraButtons() {
    document.querySelectorAll("[data-camera-target]").forEach((button) => {
      const { cameraTarget, cameraMode } = button.dataset;
      const isActive = cameraTarget && cameraMode && this.cameraModes[cameraTarget] === cameraMode;
      button.classList.toggle("is-active", Boolean(isActive));
    });
  }

  /**
   * 打开或关闭移动端侧栏
   *
   * @param {boolean} isOpen 是否打开
   */
  _toggleSidebar(isOpen) {
    const sidebar = document.getElementById("sidebar");
    sidebar?.classList.toggle("sidebar--open", isOpen);
  }

  /**
   * 切换主视图
   *
   * @param {string} view 目标视图标识
   */
  _switchView(view) {
    this.activeView = view;
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === view);
    });
    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
    });
    this._toggleSidebar(false);

    if (this.hasStarted) {
      this._renderCurrentView({ useLowRes: false });
    }
  }

  /**
   * 更新状态提示
   *
   * @param {string} text 提示文本
   */
  _setStatus(text) {
    const status = document.getElementById("render-status");
    if (status) {
      status.textContent = text;
    }
  }

  /**
   * 更新 Worker 状态提示
   */
  _setWorkerStatus() {
    const status = document.getElementById("worker-status");
    if (!status) {
      return;
    }

    status.textContent = this.useWorker
      ? "Worker pipeline active"
      : "Main-thread fallback";
  }

  /**
   * 外部入口：首次渲染
   */
  async start() {
    try {
      const sharedParams = this.snapshots.parseShareLink();
      if (sharedParams) {
        Object.assign(this.state, sharedParams);
        this.ui.syncFromState(this.state);
        this.errorHandler.showWarning("Loaded parameters from share link.", 2600);
      }

      this.useWorker = await this.worker.init();
      this._setWorkerStatus();
      this.hasStarted = true;
      await this._renderCurrentView({ useLowRes: false });
    } catch (error) {
      this.errorHandler.showError(`Initialization failed: ${error.message}`);
      console.error("App initialization error:", error);
      this._setStatus("Initialization failed");
    }
  }

  /**
   * 同步 UI 参数至状态
   */
  _updateParamsFromUI() {
    Object.assign(this.state, this.ui.getParams());
    this._initTheme();
  }

  /**
   * 根据当前视图执行渲染
   *
   * @param {{ useLowRes: boolean }} options 渲染选项
   */
  async _renderCurrentView({ useLowRes }) {
    const renderingText = useLowRes ? "Previewing current view..." : "Refreshing current view...";
    this._setStatus(renderingText);

    if (this.activeView === "overview") {
      this._renderSelfChecks(this.state);
      this._setStatus("Overview synced");
      return;
    }

    const specs = SURFACE_GROUPS[this.activeView] ?? [];
    await this._renderSurfaceGroup(specs, { useLowRes });

    if (!useLowRes) {
      this._performValidation(this.state);
      this._setStatus(`${specs.length} surfaces synced`);
    } else {
      this._setStatus(`Previewing ${specs.length} surfaces`);
    }
  }

  /**
   * 为当前视图导出 PNG
   */
  async _exportCurrentView() {
    const containerIds = this._getRenderableContainerIds();
    if (containerIds.length === 0) {
      this.errorHandler.showWarning("No visible plots available for export.", 2400);
      return;
    }

    await this.renderer.exportPNGs(containerIds);
    this.errorHandler.showWarning("Visible plots exported as PNG.", 2600);
  }

  /**
   * 获取当前可导出的图表容器
   *
   * @returns {string[]} 图表容器 ID 列表
   */
  _getRenderableContainerIds() {
    if (this.activeView === "overview") {
      return SELF_CHECK_SPECS.map((spec) => spec.containerId);
    }
    return (SURFACE_GROUPS[this.activeView] ?? []).map((spec) => spec.containerId);
  }

  /**
   * 构建网格与波动率上下文
   *
   * @param {boolean} useLowRes 是否使用低分辨率
   * @returns {object} 渲染上下文
   */
  _buildSurfaceContext(useLowRes) {
    const {
      s0,
      sigma,
      r,
      q,
      kMin,
      kMax,
      tMin,
      tMax,
      resHigh,
      resLow,
      marketFlavor,
    } = this.state;

    const resolution = useLowRes ? resLow : resHigh;
    const { kAxis, tAxis, Kgrid, Fgrid } = this.grid.generateKTGrid({
      s0,
      r,
      q,
      kMin,
      kMax,
      tMin,
      tMax,
      nk: resolution.nk,
      nt: resolution.nt,
    });

    const sigmaGrid = marketFlavor
      ? this.svi.generateSurface(kAxis, tAxis, sigma)
      : this.grid.fillSigmaGrid({ nt: tAxis.length, nk: kAxis.length, value: sigma });

    if (marketFlavor) {
      const warnings = this.svi.validateNoArbitrage(sigmaGrid, kAxis, tAxis);
      if (warnings.length > 0) {
        console.warn("SVI arbitrage warnings:", warnings);
      }
    }

    return {
      kAxis,
      tAxis,
      Kgrid,
      Fgrid,
      sigmaGrid,
      r,
      q,
    };
  }

  /**
   * 渲染指定分组的曲面卡片
   *
   * @param {Array<object>} specs 曲面规格
   * @param {{ useLowRes: boolean }} options 渲染选项
   */
  async _renderSurfaceGroup(specs, { useLowRes }) {
    const context = this._buildSurfaceContext(useLowRes);
    const greekResults = await this._computeGreeksForSpecs(specs, context, useLowRes);

    this.errorHandler.checkComputationAnomalies(greekResults, this.state);

    specs.forEach((spec) => {
      const range = this.renderer.renderSurface({
        containerId: spec.containerId,
        kAxis: context.kAxis,
        tAxis: context.tAxis,
        z: greekResults[spec.id],
        title: spec.title,
        zAxisLabel: spec.zAxisLabel,
        colorScale: spec.colorScale,
        zlock: this.state.zlock,
        cameraMode: this.cameraModes[spec.id],
      });

      const rangeElement = document.getElementById(`range-${spec.id}`);
      if (rangeElement) {
        rangeElement.textContent = `${this._formatRangeValue(range.min)} to ${this._formatRangeValue(range.max)}`;
      }
    });
  }

  /**
   * 计算指定曲面的希腊字母结果
   *
   * @param {Array<object>} specs 曲面规格
   * @param {object} context 网格上下文
   * @param {boolean} useLowRes 是否使用低分辨率
   * @returns {Promise<Record<string, number[][]>>} 希腊字母结果
   */
  async _computeGreeksForSpecs(specs, context, useLowRes) {
    const { kAxis, tAxis, Kgrid, Fgrid, sigmaGrid, r, q } = context;
    const greekNames = specs.map((spec) => spec.id);

    if (this.useWorker && !useLowRes) {
      try {
        return await this.worker.computeGreeks({
          kAxis,
          tAxis,
          Kgrid,
          Fgrid,
          sigmaGrid,
          params: { r, q },
          greekNames,
        });
      } catch (error) {
        console.warn("Worker computation failed, falling back to main thread:", error);
        this.useWorker = false;
        this._setWorkerStatus();
      }
    }

    const calculators = {
      delta: (args) => this.greeks.deltaCall(args),
      gamma: (args) => this.greeks.gamma(args),
      vega: (args) => this.greeks.vega(args),
      theta: (args) => this.greeks.thetaCallPerYear(args),
      vanna: (args) => this.greeks.vanna(args),
      charm: (args) => this.greeks.charmCall(args),
      vomma: (args) => this.greeks.vomma(args),
      speed: (args) => this.greeks.speed(args),
      zomma: (args) => this.greeks.zomma(args),
      veta: (args) => this.greeks.veta(args),
    };

    return Object.fromEntries(
      specs.map((spec) => [
        spec.id,
        this.grid.mapOverGrid(
          (i, j) => calculators[spec.id]({
            S: Fgrid[i][j],
            K: Kgrid[i][j],
            T: tAxis[i],
            sigma: sigmaGrid[i][j],
            r,
            q,
          }),
          tAxis.length,
          kAxis.length,
        ),
      ]),
    );
  }

  /**
   * 格式化区间显示值
   *
   * @param {number} value 数值
   * @returns {string} 格式化结果
   */
  _formatRangeValue(value) {
    if (!Number.isFinite(value)) {
      return "n/a";
    }

    const absValue = Math.abs(value);
    if (absValue >= 1000 || (absValue > 0 && absValue < 0.001)) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  }

  /**
   * 执行数值验证
   *
   * @param {{ s0: number, sigma: number, r: number, q: number }} params 参数集合
   */
  _performValidation({ s0, sigma, r, q }) {
    const testPoints = [
      { S: s0, K: s0, T: 0.25, sigma, r, q },
      { S: s0 * 1.1, K: s0, T: 1.0, sigma, r, q },
      { S: s0 * 0.9, K: s0, T: 2.0, sigma, r, q },
    ];

    const report = this.validator.generateValidationReport(testPoints);
    if (report.failed > 0) {
      console.warn("Validation failed:", report);
    }
  }

  /**
   * 渲染 2D 自检：ATM 期限结构与固定 T 的微笑
   *
   * @param {{ s0: number, sigma: number, r: number, q: number, preset: string, marketFlavor: boolean }} params 参数
   */
  _renderSelfChecks({ sigma, preset, marketFlavor }) {
    const tAxis = this.grid.linspace(0.02, 2.0, 60);
    let series = [];

    if (marketFlavor) {
      const sviTermStructure = tAxis.map((timeToExpiry) => {
        const params = this.svi.interpolateParams(timeToExpiry);
        return this.svi.sviVolatility(0, timeToExpiry, params) * sigma / 0.2;
      });
      series.push({ name: "SVI Market", y: sviTermStructure, color: "#27B3A7" });
    } else {
      const sigmaNormal = tAxis.map((timeToExpiry) => sigma * MathUtils.termStructureFactor(timeToExpiry, "normal"));
      const sigmaShock = tAxis.map((timeToExpiry) => sigma * MathUtils.termStructureFactor(timeToExpiry, "shock"));
      series = [
        { name: "Normal", y: sigmaNormal, color: "#27B3A7" },
        { name: "Shock", y: sigmaShock, color: "#D9A441" },
      ];
    }

    this.renderer.renderLineChart({
      containerId: "selfcheck-term",
      x: tAxis,
      series,
      title: marketFlavor
        ? "ATM implied volatility term structure"
        : "ATM implied volatility under teaching presets",
      xTitle: "T (years)",
      yTitle: "sigma",
    });

    const fixedTime = 0.25;
    const kAxis = this.grid.linspace(-1.0, 1.0, 101);
    let smileSeries = [];

    if (marketFlavor) {
      const params = this.svi.interpolateParams(fixedTime);
      const sviSmile = kAxis.map((k) => this.svi.sviVolatility(k, fixedTime, params) * sigma / 0.2);
      smileSeries.push({ name: `SVI @ T=${fixedTime}`, y: sviSmile, color: "#1D5F8C" });
    } else {
      const flatSmile = kAxis.map(() => sigma * MathUtils.termStructureFactor(fixedTime, preset));
      smileSeries.push({ name: `${preset} @ T=${fixedTime}`, y: flatSmile, color: "#1D5F8C" });
    }

    this.renderer.renderLineChart({
      containerId: "selfcheck-smile",
      x: kAxis,
      series: smileSeries,
      title: marketFlavor
        ? "SVI smile slice at fixed tenor"
        : "Teaching smile slice at fixed tenor",
      xTitle: "k = ln(K/F(T))",
      yTitle: "sigma",
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new App(document.getElementById("app"));
  app.start();
});
