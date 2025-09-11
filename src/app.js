// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：应用入口，负责组装 UI、网格、模型与渲染模块
import { MathUtils, Debouncer } from "./utils/MathUtils.js";
import { BlackScholesModel, GreeksEngine } from "./model/BlackScholesModel.js";
import { SVIModel } from "./model/SVIModel.js";
import { GridGenerator } from "./grid/GridGenerator.js";
import { PlotlyRenderer } from "./render/PlotlyRenderer.js";
import { UIController } from "./ui/Controls.js";
import { ErrorHandler } from "./ui/ErrorHandler.js";
import { WorkerManager } from "./workers/WorkerManager.js";
import { NumericalValidator } from "./validation/NumericalValidator.js";
import { SnapshotManager } from "./utils/SnapshotManager.js";

class App {
  /**
   * @param {HTMLElement} root 应用根容器
   */
  constructor(root) {
    this.root = root;
    this.state = {
      s0: 500,
      sigma: 0.20,
      r: 0.04,
      q: 0.015,
      preset: "normal",
      theme: "dark",
      zlock: false,
      marketFlavor: false,
      // 统一配置
      kMin: -1.0,
      kMax: 1.0,
      tMin: 0.02,
      tMax: 2.0,
      resHigh: { nk: 121, nt: 60 },
      resLow: { nk: 61, nt: 30 },
    };

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
    this.debouncer = new Debouncer(260);
    this.useWorker = false;

    this._bindUI();
    this._initTheme();
  }

  /**
   * 初始化主题样式
   */
  _initTheme() {
    document.body.classList.toggle("light", this.state.theme === "light");
  }

  /**
   * 绑定 UI 控件事件
   */
  _bindUI() {
    this.ui.onChangeImmediate(() => {
      // 低分辨率预览（LOD）
      this._updateParamsFromUI();
      this._renderAll({ useLowRes: true });
    });
    this.ui.onChangeSettled(() => {
      // 用户停止拖动后，高分辨率补算
      this._updateParamsFromUI();
      this.debouncer.run(() => this._renderAll({ useLowRes: false }));
    });

    // Tab 切换
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const target = btn.getAttribute("data-target");
        const el = document.getElementById(target);
        if (el) el.classList.add("active");
        // 切换时不强制重算，等用户下一次交互或首次加载
      });
    });

    // 工具按钮
    document.getElementById("btn_reset_view").addEventListener("click", () => {
      this.renderer.resetViews();
    });
    document.getElementById("btn_export_png").addEventListener("click", () => {
      this.renderer.exportPNGs([
        "surface-delta",
        "surface-gamma",
        "surface-vega",
        "surface-theta",
        "surface-vanna",
        "surface-charm",
        "surface-vomma",
        "surface-speed",
        "surface-zomma",
        "surface-veta",
        "selfcheck-term",
        "selfcheck-smile",
      ]);
    });
    document.getElementById("btn_copy_json").addEventListener("click", () => {
      const params = JSON.stringify(this.state, null, 2);
      navigator.clipboard.writeText(params).catch(() => {});
    });
    document.getElementById("btn_save_snapshot").addEventListener("click", () => {
      const name = prompt("Snapshot name (optional):");
      const snapshot = this.snapshots.saveSnapshot(this.state, name);
      this.errorHandler.showWarning(`Snapshot saved: ${snapshot.name}`, 3000);
    });
    document.getElementById("btn_share_link").addEventListener("click", () => {
      const shareLink = this.snapshots.generateShareLink(this.state);
      navigator.clipboard.writeText(shareLink).then(() => {
        this.errorHandler.showWarning("Share link copied to clipboard!", 3000);
      }).catch(() => {
        prompt("Copy this share link:", shareLink);
      });
    });

    // Assumptions modal
    const modal = document.getElementById("assumptions_modal");
    const openBtn = document.getElementById("btn_assumptions");
    const closeBtn = document.getElementById("assumptions_close");
    const okBtn = document.getElementById("assumptions_ok");
    const backdrop = modal?.querySelector('.modal-backdrop');
    const hideModal = () => modal.classList.add('hidden');
    const showModal = () => modal.classList.remove('hidden');
    if (openBtn && modal) openBtn.addEventListener('click', showModal);
    if (closeBtn) closeBtn.addEventListener('click', hideModal);
    if (okBtn) okBtn.addEventListener('click', hideModal);
    if (backdrop) backdrop.addEventListener('click', hideModal);
  }

  /**
   * 同步 UI 参数至状态
   */
  _updateParamsFromUI() {
    const p = this.ui.getParams();
    Object.assign(this.state, p);
    document.body.classList.toggle("light", this.state.theme === "light");
  }

  /**
   * 外部入口：首次渲染
   */
  async start() {
    try {
      // 检查分享链接
      const sharedParams = this.snapshots.parseShareLink();
      if (sharedParams) {
        Object.assign(this.state, sharedParams);
        this.ui.syncFromState(this.state);
        this.errorHandler.showWarning("Loaded parameters from share link", 3000);
      }

      // 尝试初始化 Web Worker
      this.useWorker = await this.worker.init();
      if (this.useWorker) {
        console.log('Web Worker initialized successfully');
      } else {
        console.log('Falling back to main thread computation');
      }
      
      this._renderAll({ useLowRes: false });
    } catch (error) {
      this.errorHandler.showError(`Initialization failed: ${error.message}`);
      console.error('App initialization error:', error);
    }
  }

  /**
   * 计算并渲染所有图表
   */
  async _renderAll({ useLowRes }) {
    const { s0, sigma, r, q, kMin, kMax, tMin, tMax, resHigh, resLow, zlock, preset, marketFlavor } = this.state;
    const res = useLowRes ? resLow : resHigh;

    // 生成 (k, T) 网格
    const { kAxis, tAxis, Kgrid, Fgrid } = this.grid.generateKTGrid({
      s0,
      r,
      q,
      kMin,
      kMax,
      tMin,
      tMax,
      nk: res.nk,
      nt: res.nt,
    });

    // 波动率网格：根据市场风味选择常数或 SVI 曲面
    let sigmaGrid;
    if (marketFlavor) {
      sigmaGrid = this.svi.generateSurface(kAxis, tAxis, sigma);
      // 验证无套利约束
      const warnings = this.svi.validateNoArbitrage(sigmaGrid, kAxis, tAxis);
      if (warnings.length > 0) {
        console.warn('SVI arbitrage warnings:', warnings);
      }
    } else {
      sigmaGrid = this.grid.fillSigmaGrid({ nt: tAxis.length, nk: kAxis.length, value: sigma });
    }

    // 计算所有希腊字母（使用动态波动率）
    const greekResults = await this._computeAllGreeks({
      kAxis, tAxis, Kgrid, Fgrid, sigmaGrid, r, q, useLowRes
    });

    const { deltaZ, gammaZ, vegaZ, thetaZ, vannaZ, charmZ, vommaZ, speedZ, zommaZ, vetaZ } = greekResults;

    // 异常检测
    this.errorHandler.checkComputationAnomalies(greekResults, { s0, sigma, r, q });

    // 渲染 3D Surface
    this.renderer.renderSurface({ containerId: "surface-delta", kAxis, tAxis, z: deltaZ, title: "Delta (call) — ∂C/∂S" , zlock});
    this.renderer.renderSurface({ containerId: "surface-gamma", kAxis, tAxis, z: gammaZ, title: "Gamma — ∂²C/∂S² ∝ 1/√T" , zlock});
    this.renderer.renderSurface({ containerId: "surface-vega", kAxis, tAxis, z: vegaZ, title: "Vega — ∂C/∂σ ∝ √T" , zlock});
    this.renderer.renderSurface({ containerId: "surface-theta", kAxis, tAxis, z: thetaZ, title: "Theta (per year) — ∂C/∂t" , zlock});

    this.renderer.renderSurface({ containerId: "surface-vanna", kAxis, tAxis, z: vannaZ, title: "Vanna — ∂²C/(∂S∂σ)" , zlock});
    this.renderer.renderSurface({ containerId: "surface-charm", kAxis, tAxis, z: charmZ, title: "Charm — ∂Delta/∂t" , zlock});
    this.renderer.renderSurface({ containerId: "surface-vomma", kAxis, tAxis, z: vommaZ, title: "Vomma (Volga) — ∂Vega/∂σ" , zlock});
    this.renderer.renderSurface({ containerId: "surface-speed", kAxis, tAxis, z: speedZ, title: "Speed — ∂Gamma/∂S" , zlock});
    this.renderer.renderSurface({ containerId: "surface-zomma", kAxis, tAxis, z: zommaZ, title: "Zomma — ∂Gamma/∂σ" , zlock});
    this.renderer.renderSurface({ containerId: "surface-veta", kAxis, tAxis, z: vetaZ, title: "Veta — ∂Vega/∂t" , zlock});

    // 2D 自检：期限结构与微笑切片（仅教学用途）
    this._renderSelfChecks({ s0, sigma, r, q, preset, marketFlavor });

    // 数值验证（仅在开发模式下）
    if (!useLowRes && Math.random() < 0.1) { // 10% 概率进行验证
      this._performValidation({ s0, sigma, r, q });
    }
  }

  /**
   * 计算所有希腊字母（支持 Worker 并行计算）
   */
  async _computeAllGreeks({ kAxis, tAxis, Kgrid, Fgrid, sigmaGrid, r, q, useLowRes }) {
    const greekNames = ['delta', 'gamma', 'vega', 'theta', 'vanna', 'charm', 'vomma', 'speed', 'zomma', 'veta'];
    
    if (this.useWorker && !useLowRes) {
      try {
        // 使用 Worker 进行并行计算
        const results = await this.worker.computeGreeks({
          kAxis, tAxis, Kgrid, Fgrid,
          params: { sigma: sigmaGrid[0][0], r, q }, // 简化：使用第一个点的 sigma
          greekNames
        });
        
        return {
          deltaZ: results.delta,
          gammaZ: results.gamma,
          vegaZ: results.vega,
          thetaZ: results.theta,
          vannaZ: results.vanna,
          charmZ: results.charm,
          vommaZ: results.vomma,
          speedZ: results.speed,
          zommaZ: results.zomma,
          vetaZ: results.veta
        };
      } catch (error) {
        console.warn('Worker computation failed, falling back to main thread:', error);
      }
    }
    
    // 主线程计算（带动态波动率支持）
    const deltaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.deltaCall({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const gammaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.gamma({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const vegaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.vega({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const thetaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.thetaCallPerYear({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const vannaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.vanna({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const charmZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.charmCall({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const vommaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.vomma({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const speedZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.speed({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const zommaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.zomma({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    const vetaZ = this.grid.mapOverGrid((i, j) =>
      this.greeks.veta({ S: Fgrid[i][j], K: Kgrid[i][j], T: tAxis[i], sigma: sigmaGrid[i][j], r, q })
    , tAxis.length, kAxis.length);

    return { deltaZ, gammaZ, vegaZ, thetaZ, vannaZ, charmZ, vommaZ, speedZ, zommaZ, vetaZ };
  }

  /**
   * 执行数值验证
   */
  _performValidation({ s0, sigma, r, q }) {
    const testPoints = [
      { S: s0, K: s0, T: 0.25, sigma, r, q }, // ATM 短期
      { S: s0 * 1.1, K: s0, T: 1.0, sigma, r, q }, // ITM 中期
      { S: s0 * 0.9, K: s0, T: 2.0, sigma, r, q }, // OTM 长期
    ];

    const report = this.validator.generateValidationReport(testPoints);
    
    if (report.failed > 0) {
      console.warn('Validation failed:', report);
    } else {
      console.log('Validation passed:', `${report.passed}/${report.totalTests} tests`);
    }
  }

  /**
   * 渲染 2D 自检：ATM 期限结构与固定 T 的微笑
   */
  _renderSelfChecks({ s0, sigma, r, q, preset, marketFlavor }) {
    // ATM 期限结构
    const tAxis = this.grid.linspace(0.02, 2.0, 60);
    let series = [];
    
    if (marketFlavor) {
      // SVI 模式：显示 SVI 期限结构
      const sviTermStructure = tAxis.map((T) => {
        const params = this.svi.interpolateParams(T);
        return this.svi.sviVolatility(0, T, params) * sigma / 0.20; // ATM (k=0)
      });
      series.push({ name: "SVI Market", y: sviTermStructure });
    } else {
      // 教学模式：显示预设期限结构
      const sigmaNormal = tAxis.map((T) => sigma * MathUtils.termStructureFactor(T, "normal"));
      const sigmaShock = tAxis.map((T) => sigma * MathUtils.termStructureFactor(T, "shock"));
      series = [
        { name: "Normal", y: sigmaNormal },
        { name: "Shock", y: sigmaShock },
      ];
    }
    
    this.renderer.renderLineChart({
      containerId: "selfcheck-term",
      x: tAxis,
      series,
      title: marketFlavor ? "ATM implied vol (SVI market flavor)" : "ATM implied vol term structure (teaching preset)",
      xTitle: "T (years)",
      yTitle: "sigma",
    });

    // 固定 T 的微笑切片
    const Tfix = 0.25;
    const kAxis = this.grid.linspace(-1.0, 1.0, 101);
    let smileSeries = [];
    
    if (marketFlavor) {
      // SVI 微笑
      const params = this.svi.interpolateParams(Tfix);
      const sviSmile = kAxis.map((k) => this.svi.sviVolatility(k, Tfix, params) * sigma / 0.20);
      smileSeries.push({ name: `SVI @ T=${Tfix}`, y: sviSmile });
    } else {
      // 教学模式：平坦微笑
      const volOfT = (T) => sigma * MathUtils.termStructureFactor(T, preset);
      const flatSmile = kAxis.map(() => volOfT(Tfix));
      smileSeries.push({ name: `${preset} @ T=${Tfix}`, y: flatSmile });
    }
    
    this.renderer.renderLineChart({
      containerId: "selfcheck-smile",
      x: kAxis,
      series: smileSeries,
      title: marketFlavor ? "Volatility smile (SVI market flavor)" : "Smile slice at fixed T (teaching preset)",
      xTitle: "k = ln(K/F(T))",
      yTitle: "sigma",
    });
  }
}

// 启动应用
window.addEventListener("DOMContentLoaded", () => {
  const app = new App(document.getElementById("app"));
  app.start();
});


