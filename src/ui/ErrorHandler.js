// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：错误处理器和异常检测指示器
export class ErrorHandler {
  constructor() {
    this.errorContainer = null;
    this.warningContainer = null;
    this.init();
  }

  /**
   * 初始化错误显示容器
   */
  init() {
    // 创建错误提示容器
    this.errorContainer = document.createElement('div');
    this.errorContainer.id = 'error-indicator';
    this.errorContainer.className = 'error-indicator hidden';
    this.errorContainer.innerHTML = `
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message"></span>
        <button class="error-close" onclick="this.parentElement.parentElement.classList.add('hidden')">×</button>
      </div>
    `;

    // 创建警告提示容器
    this.warningContainer = document.createElement('div');
    this.warningContainer.id = 'warning-indicator';
    this.warningContainer.className = 'warning-indicator hidden';
    this.warningContainer.innerHTML = `
      <div class="warning-content">
        <span class="warning-icon">💡</span>
        <span class="warning-message"></span>
        <button class="warning-close" onclick="this.parentElement.parentElement.classList.add('hidden')">×</button>
      </div>
    `;

    // 添加到页面
    document.body.appendChild(this.errorContainer);
    document.body.appendChild(this.warningContainer);

    // 添加样式
    this.addStyles();

    // 全局错误捕获
    window.addEventListener('error', (event) => {
      this.showError(`JavaScript Error: ${event.message}`, 5000);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.showError(`Promise Rejection: ${event.reason}`, 5000);
    });
  }

  /**
   * 添加样式
   */
  addStyles() {
    if (document.getElementById('error-handler-styles')) return;

    const style = document.createElement('style');
    style.id = 'error-handler-styles';
    style.textContent = `
      .error-indicator, .warning-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
      }

      .error-indicator {
        background: #fee2e2;
        border: 1px solid #fca5a5;
        color: #991b1b;
      }

      .warning-indicator {
        background: #fef3c7;
        border: 1px solid #fbbf24;
        color: #92400e;
      }

      .error-content, .warning-content {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        gap: 8px;
      }

      .error-icon, .warning-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .error-message, .warning-message {
        flex: 1;
        font-size: 14px;
      }

      .error-close, .warning-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .error-close:hover {
        background: rgba(153, 27, 27, 0.1);
      }

      .warning-close:hover {
        background: rgba(146, 64, 14, 0.1);
      }

      .hidden {
        opacity: 0;
        transform: translateX(100%);
        pointer-events: none;
      }

      .light .error-indicator {
        background: #fef2f2;
        border-color: #f87171;
        color: #dc2626;
      }

      .light .warning-indicator {
        background: #fffbeb;
        border-color: #f59e0b;
        color: #d97706;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示错误消息
   */
  showError(message, duration = 8000) {
    const messageEl = this.errorContainer.querySelector('.error-message');
    messageEl.textContent = message;
    this.errorContainer.classList.remove('hidden');
    
    if (duration > 0) {
      setTimeout(() => {
        this.errorContainer.classList.add('hidden');
      }, duration);
    }
  }

  /**
   * 显示警告消息
   */
  showWarning(message, duration = 6000) {
    const messageEl = this.warningContainer.querySelector('.warning-message');
    messageEl.textContent = message;
    this.warningContainer.classList.remove('hidden');
    
    if (duration > 0) {
      setTimeout(() => {
        this.warningContainer.classList.add('hidden');
      }, duration);
    }
  }

  /**
   * 检查计算异常
   */
  checkComputationAnomalies(greekResults, params) {
    const warnings = [];
    const { s0, sigma, r, q } = params;

    // 检查 NaN 或 Infinity
    for (const [greekName, surface] of Object.entries(greekResults)) {
      if (!surface || !Array.isArray(surface)) continue;
      
      let hasNaN = false;
      let hasInfinity = false;
      
      for (let i = 0; i < surface.length && !hasNaN && !hasInfinity; i++) {
        for (let j = 0; j < surface[i].length; j++) {
          const val = surface[i][j];
          if (isNaN(val)) hasNaN = true;
          if (!isFinite(val)) hasInfinity = true;
          if (hasNaN || hasInfinity) break;
        }
      }
      
      if (hasNaN) warnings.push(`${greekName} contains NaN values`);
      if (hasInfinity) warnings.push(`${greekName} contains infinite values`);
    }

    // 检查参数合理性
    if (sigma < 0.05) warnings.push('Volatility very low (< 5%)');
    if (sigma > 0.8) warnings.push('Volatility very high (> 80%)');
    if (r < 0) warnings.push('Negative interest rate detected');
    if (r > 0.15) warnings.push('Interest rate very high (> 15%)');

    // 显示警告
    if (warnings.length > 0) {
      this.showWarning(`Computation anomalies: ${warnings.join('; ')}`);
      console.warn('Computation anomalies detected:', warnings);
    }

    return warnings;
  }

  /**
   * 检查数值稳定性
   */
  checkNumericalStability(validationReport) {
    if (!validationReport) return;

    const { failed, warnings, totalTests } = validationReport;
    
    if (failed > 0) {
      this.showError(`Numerical validation failed: ${failed}/${totalTests} tests failed`);
    }
    
    if (warnings.length > 5) {
      this.showWarning(`Multiple numerical warnings (${warnings.length})`);
    }
  }

  /**
   * 清除所有提示
   */
  clearAll() {
    this.errorContainer.classList.add('hidden');
    this.warningContainer.classList.add('hidden');
  }
}
