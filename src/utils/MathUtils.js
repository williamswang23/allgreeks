// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

/**
 * 数学工具：正态分布、裁剪、抖动、取整等
 */
export class MathUtils {
  /**
   * 误差函数 erf(x) 的近似实现（Abramowitz & Stegun 7.1.26）
   * 最大绝对误差 ~1.5e-7，足够金融计算使用
   */
  static erf(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }
  /** 正态分布密度函数 φ(x) */
  static pdf(x) {
    const xx = x * x;
    return Math.exp(-0.5 * xx) / Math.sqrt(2 * Math.PI);
  }

  /** 正态分布分位函数 Φ(x)，使用 erf 近似，限制区间 ±8 以保证稳定性 */
  static cdf(x) {
    const z = Math.max(-8, Math.min(8, x));
    return 0.5 * (1 + MathUtils.erf(z / Math.SQRT2));
  }

  /** 将数值限制在 [minV, maxV] */
  static clamp(x, minV, maxV) {
    return Math.max(minV, Math.min(maxV, x));
  }

  /** 安全的 sqrt(T) 处理，T 有下界 */
  static safeSqrtTime(T, Tmin = 0.02) {
    return Math.sqrt(Math.max(Tmin, T));
  }

  /**
   * 期限结构修饰：根据预设 Normal/ Shock 返回 sigma 的倍率
   * 纯教学用途：Base 阶段用于 2D 自检，不用于 3D 主图（主图仍用常数 sigma）
   */
  static termStructureFactor(T, preset = "normal") {
    const τ = 0.4; // 倾斜的快慢
    const α = 0.25; // 倾斜幅度
    if (preset === "normal") {
      // 上倾：短端略低，长端略高
      return 1 + α * (1 - Math.exp(-T / τ));
    }
    // 倒挂：短端略高，长端回归
    return 1 + α * (Math.exp(-T / τ) - 1);
  }
}

/**
 * 轻量级防抖器：用于 LOD 机制，在用户停止拖动后再执行高分辨率计算
 */
export class Debouncer {
  constructor(delayMs = 300) {
    this.delayMs = delayMs;
    this.timer = null;
  }

  /**
   * 调用时会重置计时器，只有在 `delayMs` 内未再次触发时才执行 fn。
   */
  run(fn) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      fn();
    }, this.delayMs);
  }
}


