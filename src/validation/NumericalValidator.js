// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：数值验证器，用于有限差分校验和异常检测
import { BlackScholesModel, GreeksEngine } from "../model/BlackScholesModel.js";

export class NumericalValidator {
  constructor() {
    this.model = new BlackScholesModel({ tMin: 0.02, sigmaMin: 0.05, maxAbsD: 8 });
    this.greeks = new GreeksEngine(this.model);
    this.warnings = [];
  }

  /**
   * 有限差分验证希腊字母计算精度
   */
  validateGreeks({ S, K, T, sigma, r, q }, tolerance = 1e-3) {
    const results = {};
    const eps = 1e-4; // 差分步长

    // Delta 验证 (∂C/∂S)
    const C_up = this.model.callPrice({ S: S + eps, K, T, sigma, r, q });
    const C_down = this.model.callPrice({ S: S - eps, K, T, sigma, r, q });
    const delta_fd = (C_up - C_down) / (2 * eps);
    const delta_analytical = this.greeks.deltaCall({ S, K, T, sigma, r, q });
    results.delta = {
      analytical: delta_analytical,
      finiteDiff: delta_fd,
      error: Math.abs(delta_analytical - delta_fd),
      isValid: Math.abs(delta_analytical - delta_fd) < tolerance
    };

    // Gamma 验证 (∂²C/∂S²)
    const delta_up = this.greeks.deltaCall({ S: S + eps, K, T, sigma, r, q });
    const delta_down = this.greeks.deltaCall({ S: S - eps, K, T, sigma, r, q });
    const gamma_fd = (delta_up - delta_down) / (2 * eps);
    const gamma_analytical = this.greeks.gamma({ S, K, T, sigma, r, q });
    results.gamma = {
      analytical: gamma_analytical,
      finiteDiff: gamma_fd,
      error: Math.abs(gamma_analytical - gamma_fd),
      isValid: Math.abs(gamma_analytical - gamma_fd) < tolerance * 10 // 二阶导数容差更大
    };

    // Vega 验证 (∂C/∂σ)
    const C_vol_up = this.model.callPrice({ S, K, T, sigma: sigma + eps, r, q });
    const C_vol_down = this.model.callPrice({ S, K, T, sigma: sigma - eps, r, q });
    const vega_fd = (C_vol_up - C_vol_down) / (2 * eps);
    const vega_analytical = this.greeks.vega({ S, K, T, sigma, r, q });
    results.vega = {
      analytical: vega_analytical,
      finiteDiff: vega_fd,
      error: Math.abs(vega_analytical - vega_fd),
      isValid: Math.abs(vega_analytical - vega_fd) < tolerance
    };

    // Theta 验证 (∂C/∂T)
    const C_time_up = this.model.callPrice({ S, K, T: T + eps, sigma, r, q });
    const C_time_down = this.model.callPrice({ S, K, T: T - eps, sigma, r, q });
    const theta_fd = -(C_time_up - C_time_down) / (2 * eps); // 注意符号
    const theta_analytical = this.greeks.thetaCallPerYear({ S, K, T, sigma, r, q });
    results.theta = {
      analytical: theta_analytical,
      finiteDiff: theta_fd,
      error: Math.abs(theta_analytical - theta_fd),
      isValid: Math.abs(theta_analytical - theta_fd) < tolerance * 5
    };

    return results;
  }

  /**
   * 检查希腊字母的合理性边界
   */
  checkBounds({ S, K, T, sigma, r, q }) {
    const warnings = [];
    
    const delta = this.greeks.deltaCall({ S, K, T, sigma, r, q });
    const gamma = this.greeks.gamma({ S, K, T, sigma, r, q });
    const vega = this.greeks.vega({ S, K, T, sigma, r, q });
    const theta = this.greeks.thetaCallPerYear({ S, K, T, sigma, r, q });

    // Delta 边界检查 [0, 1]
    if (delta < -0.01 || delta > 1.01) {
      warnings.push(`Delta out of bounds: ${delta.toFixed(4)}`);
    }

    // Gamma 应为非负
    if (gamma < -1e-6) {
      warnings.push(`Gamma negative: ${gamma.toFixed(6)}`);
    }

    // Vega 应为非负
    if (vega < -1e-6) {
      warnings.push(`Vega negative: ${vega.toFixed(6)}`);
    }

    // Theta 通常为负（时间衰减）
    if (theta > 1e-3 && T > 0.1) {
      warnings.push(`Theta unexpectedly positive: ${theta.toFixed(4)}`);
    }

    return warnings;
  }

  /**
   * 检查希腊字母的单调性
   */
  checkMonotonicity(greekName, axis, values, axisValues) {
    const warnings = [];
    
    if (greekName === 'gamma' && axis === 'T') {
      // Gamma 应随 T 减少（在 ATM 附近）
      for (let i = 1; i < values.length; i++) {
        if (values[i] > values[i-1] * 1.1) { // 允许 10% 容差
          warnings.push(`Gamma increasing with time at T=${axisValues[i].toFixed(2)}`);
          break;
        }
      }
    }
    
    if (greekName === 'vega' && axis === 'T') {
      // Vega 应随 T 增加
      for (let i = 1; i < values.length; i++) {
        if (values[i] < values[i-1] * 0.9) { // 允许 10% 容差
          warnings.push(`Vega decreasing with time at T=${axisValues[i].toFixed(2)}`);
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * 综合验证报告
   */
  generateValidationReport(testPoints) {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: testPoints.length,
      passed: 0,
      failed: 0,
      warnings: [],
      details: []
    };

    for (const point of testPoints) {
      const validation = this.validateGreeks(point);
      const bounds = this.checkBounds(point);
      
      let pointPassed = true;
      const pointWarnings = [...bounds];

      // 检查每个希腊字母的验证结果
      for (const [greekName, result] of Object.entries(validation)) {
        if (!result.isValid) {
          pointPassed = false;
          pointWarnings.push(`${greekName} validation failed: error=${result.error.toFixed(6)}`);
        }
      }

      if (pointPassed) {
        report.passed++;
      } else {
        report.failed++;
      }

      report.warnings.push(...pointWarnings);
      report.details.push({
        point,
        validation,
        bounds,
        passed: pointPassed
      });
    }

    return report;
  }

  /**
   * 清除警告
   */
  clearWarnings() {
    this.warnings = [];
  }

  /**
   * 获取当前警告
   */
  getWarnings() {
    return [...this.warnings];
  }
}
