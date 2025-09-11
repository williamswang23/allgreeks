// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：BSM 模型与 Greeks 解析实现，包含必要的数值稳定化
import { MathUtils } from "../utils/MathUtils.js";

/**
 * Black-Scholes-Merton 模型内核
 */
export class BlackScholesModel {
  /**
   * @param {{ tMin: number, sigmaMin: number, maxAbsD: number }} opts
   */
  constructor(opts) {
    this.tMin = opts.tMin ?? 0.02;
    this.sigmaMin = opts.sigmaMin ?? 0.05;
    this.maxAbsD = opts.maxAbsD ?? 8.0;
  }

  /**
   * 计算 d1, d2，带稳定化与裁剪
   */
  computeD1D2(S, K, T, sigma, r, q) {
    const Tpos = Math.max(this.tMin, T);
    const sig = Math.max(this.sigmaMin, sigma);
    const F = S * Math.exp((r - q) * Tpos);
    const volSqrtT = sig * Math.sqrt(Tpos);
    const logM = Math.log((S + 1e-300) / (K + 1e-300));
    const d1 = (logM + (r - q + 0.5 * sig * sig) * Tpos) / (volSqrtT + 1e-300);
    const d2 = d1 - volSqrtT;
    const d1c = MathUtils.clamp(d1, -this.maxAbsD, this.maxAbsD);
    const d2c = MathUtils.clamp(d2, -this.maxAbsD, this.maxAbsD);
    return { d1: d1c, d2: d2c, Tpos, sig, F };
  }

  /**
   * 欧式看涨价格（教学用）
   */
  callPrice({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos } = this.computeD1D2(S, K, T, sigma, r, q);
    const Nd1 = MathUtils.cdf(d1);
    const Nd2 = MathUtils.cdf(d2);
    return S * Math.exp(-q * Tpos) * Nd1 - K * Math.exp(-r * Tpos) * Nd2;
  }
}

/**
 * Greeks 引擎（解析式，单位按年）
 */
export class GreeksEngine {
  /**
   * @param {BlackScholesModel} model
   */
  constructor(model) {
    this.m = model;
  }

  /** Delta (call) */
  deltaCall({ S, K, T, sigma, r, q }) {
    const { d1, Tpos } = this.m.computeD1D2(S, K, T, sigma, r, q);
    return Math.exp(-q * Tpos) * MathUtils.cdf(d1);
  }

  /** Gamma */
  gamma({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const denom = (S * sig * Math.sqrt(Tpos)) + 1e-300;
    return Math.exp(-q * Tpos) * MathUtils.pdf(d1) / denom;
  }

  /** Vega */
  vega({ S, K, T, sigma, r, q }) {
    const { d1, Tpos } = this.m.computeD1D2(S, K, T, sigma, r, q);
    return S * Math.exp(-q * Tpos) * MathUtils.pdf(d1) * Math.sqrt(Tpos);
  }

  /** Theta (call), per year */
  thetaCallPerYear({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const term1 = -(S * Math.exp(-q * Tpos) * MathUtils.pdf(d1) * sig) / (2 * Math.sqrt(Tpos));
    const term2 = q * S * Math.exp(-q * Tpos) * MathUtils.cdf(d1);
    const term3 = -r * K * Math.exp(-r * Tpos) * MathUtils.cdf(d2);
    return term1 + term2 + term3;
  }

  /** Vanna = ∂²C/(∂S∂σ) = ∂Delta/∂σ = e^{-qT} φ(d1) sqrt(T) * (1 - d1/(σ\sqrt{T}))? 采用常见解析式 */
  vanna({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const sqrtT = Math.sqrt(Tpos);
    return Math.exp(-q * Tpos) * MathUtils.pdf(d1) * sqrtT * (1 - d1 / (sig * sqrtT));
  }

  /** Charm (call) = ∂Delta/∂t （按年） */
  charmCall({ S, K, T, sigma, r, q }) {
    // 常见解析：Charm = -q e^{-qT} N(d1) - e^{-qT} φ(d1) * (2(r-q)T - d2 σ \sqrt{T}) / (2 T σ \sqrt{T})
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const sqrtT = Math.sqrt(Tpos);
    const termA = -q * Math.exp(-q * Tpos) * MathUtils.cdf(d1);
    const termB = -Math.exp(-q * Tpos) * MathUtils.pdf(d1) * ((2 * (r - q) * Tpos - d2 * sig * sqrtT) / (2 * Tpos * sig * sqrtT + 1e-300));
    return termA + termB;
  }

  /** Vomma (Volga) = ∂Vega/∂σ = Vega * d1 * d2 / σ */
  vomma({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const v = this.vega({ S, K, T: Tpos, sigma: sig, r, q });
    return v * d1 * d2 / (sig + 1e-300);
  }

  /** Speed = ∂Gamma/∂S = -Gamma/S * (1 + d1/(σ√T)) */
  speed({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const gamma = this.gamma({ S, K, T: Tpos, sigma: sig, r, q });
    const sqrtT = Math.sqrt(Tpos);
    return -gamma / (S + 1e-300) * (1 + d1 / (sig * sqrtT + 1e-300));
  }

  /** Zomma = ∂Gamma/∂σ = Gamma * (d1 * d2 - 1) / σ */
  zomma({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const gamma = this.gamma({ S, K, T: Tpos, sigma: sig, r, q });
    return gamma * (d1 * d2 - 1) / (sig + 1e-300);
  }

  /** Veta = ∂Vega/∂t = Vega * [q + ((r-q)*d1 - d2)/(σ√T)] */
  veta({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const vega = this.vega({ S, K, T: Tpos, sigma: sig, r, q });
    const sqrtT = Math.sqrt(Tpos);
    const term = q + ((r - q) * d1 - d2) / (sig * sqrtT + 1e-300);
    return vega * term;
  }
}


