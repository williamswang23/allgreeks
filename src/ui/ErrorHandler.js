// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：统一错误与提示消息展示，避免在核心流程中散落 print。
export class ErrorHandler {
  constructor() {
    this.errorContainer = null;
    this.warningContainer = null;
    this.init();
  }

  /**
   * 初始化提示容器与全局捕获
   */
  init() {
    this.errorContainer = this._createToast("error");
    this.warningContainer = this._createToast("warning");
    document.body.appendChild(this.errorContainer);
    document.body.appendChild(this.warningContainer);
    this._ensureStyles();

    window.addEventListener("error", (event) => {
      this.showError(`JavaScript error: ${event.message}`, 5000);
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.showError(`Unhandled promise rejection: ${String(event.reason)}`, 5000);
    });
  }

  /**
   * 创建提示容器
   *
   * @param {"error" | "warning"} tone 提示类型
   * @returns {HTMLElement} DOM 节点
   */
  _createToast(tone) {
    const element = document.createElement("div");
    element.className = `toast toast--${tone} hidden`;
    element.innerHTML = `
      <div class="toast__content">
        <span class="toast__marker">${tone === "error" ? "!" : "i"}</span>
        <span class="toast__message"></span>
        <button class="toast__close" type="button" aria-label="Dismiss">×</button>
      </div>
    `;

    element.querySelector(".toast__close")?.addEventListener("click", () => {
      element.classList.add("hidden");
    });

    return element;
  }

  /**
   * 添加内联样式
   */
  _ensureStyles() {
    if (document.getElementById("error-handler-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "error-handler-styles";
    style.textContent = `
      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1100;
        max-width: min(440px, calc(100vw - 32px));
        border-radius: 18px;
        border: 1px solid rgba(125, 149, 173, 0.18);
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(18px);
        transition: transform 160ms ease, opacity 160ms ease;
      }

      .toast--error {
        background: rgba(64, 16, 20, 0.92);
        color: #fbd6d8;
      }

      .toast--warning {
        background: rgba(48, 38, 12, 0.92);
        color: #f7ebc9;
      }

      body.light .toast--error {
        background: rgba(255, 242, 242, 0.94);
        color: #aa2b35;
      }

      body.light .toast--warning {
        background: rgba(255, 249, 226, 0.96);
        color: #8f6110;
      }

      .toast__content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
      }

      .toast__marker {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: "IBM Plex Mono", monospace;
        font-weight: 600;
        border: 1px solid currentColor;
        flex-shrink: 0;
      }

      .toast__message {
        flex: 1;
        line-height: 1.45;
      }

      .toast__close {
        min-width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .toast.hidden {
        opacity: 0;
        transform: translateY(-10px);
        pointer-events: none;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * 显示错误消息
   *
   * @param {string} message 消息文本
   * @param {number} duration 持续时间
   */
  showError(message, duration = 8000) {
    this._showToast(this.errorContainer, message, duration);
  }

  /**
   * 显示提示消息
   *
   * @param {string} message 消息文本
   * @param {number} duration 持续时间
   */
  showWarning(message, duration = 5000) {
    this._showToast(this.warningContainer, message, duration);
  }

  /**
   * 底层 toast 显示逻辑
   *
   * @param {HTMLElement} container 容器
   * @param {string} message 文本
   * @param {number} duration 持续时间
   */
  _showToast(container, message, duration) {
    const messageElement = container.querySelector(".toast__message");
    if (messageElement) {
      messageElement.textContent = message;
    }
    container.classList.remove("hidden");

    if (duration > 0) {
      window.setTimeout(() => {
        container.classList.add("hidden");
      }, duration);
    }
  }

  /**
   * 检查计算异常
   *
   * @param {Record<string, number[][]>} greekResults 希腊字母结果
   * @param {{ sigma: number, r: number }} params 当前参数
   * @returns {string[]} 警告列表
   */
  checkComputationAnomalies(greekResults, params) {
    const warnings = [];

    Object.entries(greekResults).forEach(([greekName, surface]) => {
      let hasNaN = false;
      let hasInfinity = false;

      surface.forEach((row) => {
        row.forEach((value) => {
          if (Number.isNaN(value)) {
            hasNaN = true;
          }
          if (!Number.isFinite(value)) {
            hasInfinity = true;
          }
        });
      });

      if (hasNaN) {
        warnings.push(`${greekName} contains NaN values`);
      }
      if (hasInfinity) {
        warnings.push(`${greekName} contains infinite values`);
      }
    });

    if (params.sigma < 0.05) {
      warnings.push("Volatility is near the numerical lower bound.");
    }
    if (params.sigma > 0.8) {
      warnings.push("Volatility is unusually high for teaching presets.");
    }
    if (params.r < 0) {
      warnings.push("Negative interest rate detected.");
    }
    if (params.r > 0.15) {
      warnings.push("Interest rate is unusually high.");
    }

    if (warnings.length > 0) {
      this.showWarning(`Computation anomalies: ${warnings.join("; ")}`, 7000);
      console.warn("Computation anomalies detected:", warnings);
    }

    return warnings;
  }
}
