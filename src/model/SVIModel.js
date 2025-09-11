// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：SVI 参数化波动率曲面实现
import { MathUtils } from "../utils/MathUtils.js";

/**
 * SVI (Stochastic Volatility Inspired) 模型
 * 波动率微笑：σ(k,T) = sqrt(a + b * (ρ * (k - m) + sqrt((k - m)² + σ²)))
 */
export class SVIModel {
  constructor() {
    // 预设 SVI 锚点参数（不同期限）
    this.anchors = {
      // T = 0.1年 (短期)：高波动，左偏
      0.1: { a: 0.035, b: 0.25, rho: -0.6, m: -0.05, sigma: 0.15 },
      // T = 0.5年 (中期)：中等波动，轻微左偏
      0.5: { a: 0.040, b: 0.20, rho: -0.3, m: 0.00, sigma: 0.20 },
      // T = 2.0年 (长期)：低波动，接近平坦
      2.0: { a: 0.045, b: 0.15, rho: -0.1, m: 0.02, sigma: 0.25 }
    };
  }

  /**
   * 计算 SVI 波动率
   */
  sviVolatility(k, T, params) {
    const { a, b, rho, m, sigma } = params;
    const kShift = k - m;
    const discriminant = kShift * kShift + sigma * sigma;
    const sqrtDisc = Math.sqrt(discriminant);
    const variance = a + b * (rho * kShift + sqrtDisc);
    return Math.sqrt(Math.max(0.01, variance)); // 确保正值
  }

  /**
   * 通过线性插值获取任意期限的 SVI 参数
   */
  interpolateParams(T) {
    const times = [0.1, 0.5, 2.0];
    
    if (T <= times[0]) return this.anchors[times[0]];
    if (T >= times[2]) return this.anchors[times[2]];
    
    // 找到插值区间
    let i = 0;
    while (i < times.length - 1 && T > times[i + 1]) i++;
    
    const t1 = times[i];
    const t2 = times[i + 1];
    const weight = (T - t1) / (t2 - t1);
    
    const p1 = this.anchors[t1];
    const p2 = this.anchors[t2];
    
    return {
      a: p1.a + weight * (p2.a - p1.a),
      b: p1.b + weight * (p2.b - p1.b),
      rho: p1.rho + weight * (p2.rho - p1.rho),
      m: p1.m + weight * (p2.m - p1.m),
      sigma: p1.sigma + weight * (p2.sigma - p1.sigma)
    };
  }

  /**
   * 生成整个 (k,T) 网格的 SVI 波动率曲面
   */
  generateSurface(kAxis, tAxis, baseVolatility = 0.20) {
    const surface = new Array(tAxis.length);
    
    for (let i = 0; i < tAxis.length; i++) {
      const T = tAxis[i];
      const params = this.interpolateParams(T);
      surface[i] = new Array(kAxis.length);
      
      for (let j = 0; j < kAxis.length; j++) {
        const k = kAxis[j];
        const sviVol = this.sviVolatility(k, T, params);
        // 将 SVI 作为基础波动率的调制器
        surface[i][j] = baseVolatility * sviVol / 0.20; // 归一化到基础波动率
      }
    }
    
    return surface;
  }

  /**
   * 无套利约束检查（简化版）
   */
  validateNoArbitrage(surface, kAxis, tAxis) {
    const warnings = [];
    
    // 检查日历套利：相同 k 下，波动率应大致单调
    for (let j = 0; j < kAxis.length; j++) {
      for (let i = 1; i < tAxis.length; i++) {
        const volShort = surface[i-1][j];
        const volLong = surface[i][j];
        const tShort = tAxis[i-1];
        const tLong = tAxis[i];
        
        // 总方差应单调递增
        const varShort = volShort * volShort * tShort;
        const varLong = volLong * volLong * tLong;
        
        if (varLong < varShort * 0.95) { // 允许 5% 容差
          warnings.push(`Calendar arbitrage at k=${kAxis[j].toFixed(2)}, T=${tLong.toFixed(2)}`);
        }
      }
    }
    
    return warnings;
  }
}
