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
    const content = document.createElement("div");
    content.className = "toast__content";

    const marker = document.createElement("span");
    marker.className = "toast__marker";
    marker.textContent = tone === "error" ? "!" : "i";

    const message = document.createElement("span");
    message.className = "toast__message";

    const closeButton = document.createElement("button");
    closeButton.className = "toast__close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Dismiss");
    closeButton.textContent = "×";
    closeButton.addEventListener("click", () => {
      element.classList.add("hidden");
    });

    content.append(marker, message, closeButton);
    element.appendChild(content);
    return element;
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
