// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：Greeks 计算 Worker，支持按 sigmaGrid 精确并行计算。
class WorkerMathUtils {
  static erf(x) {
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const t = 1 / (1 + p * absX);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
  }

  static pdf(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  static cdf(x) {
    const bounded = Math.max(-8, Math.min(8, x));
    return 0.5 * (1 + WorkerMathUtils.erf(bounded / Math.SQRT2));
  }

  static clamp(x, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, x));
  }
}

class WorkerBSMModel {
  constructor() {
    this.tMin = 0.02;
    this.sigmaMin = 0.05;
    this.maxAbsD = 8;
  }

  computeD1D2(S, K, T, sigma, r, q) {
    const positiveT = Math.max(this.tMin, T);
    const boundedSigma = Math.max(this.sigmaMin, sigma);
    const volSqrtT = boundedSigma * Math.sqrt(positiveT);
    const logMoneyness = Math.log((S + 1e-300) / (K + 1e-300));
    const d1 = (logMoneyness + (r - q + 0.5 * boundedSigma * boundedSigma) * positiveT) / (volSqrtT + 1e-300);
    const d2 = d1 - volSqrtT;

    return {
      d1: WorkerMathUtils.clamp(d1, -this.maxAbsD, this.maxAbsD),
      d2: WorkerMathUtils.clamp(d2, -this.maxAbsD, this.maxAbsD),
      Tpos: positiveT,
      sigma: boundedSigma,
    };
  }
}

class WorkerGreeksEngine {
  constructor() {
    this.model = new WorkerBSMModel();
  }

  delta({ S, K, T, sigma, r, q }) {
    const { d1, Tpos } = this.model.computeD1D2(S, K, T, sigma, r, q);
    return Math.exp(-q * Tpos) * WorkerMathUtils.cdf(d1);
  }

  gamma({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sigma: boundedSigma } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const denominator = (S * boundedSigma * Math.sqrt(Tpos)) + 1e-300;
    return Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) / denominator;
  }

  vega({ S, K, T, sigma, r, q }) {
    const { d1, Tpos } = this.model.computeD1D2(S, K, T, sigma, r, q);
    return S * Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * Math.sqrt(Tpos);
  }

  theta({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sigma: boundedSigma } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const term1 = -(S * Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * boundedSigma) / (2 * Math.sqrt(Tpos));
    const term2 = q * S * Math.exp(-q * Tpos) * WorkerMathUtils.cdf(d1);
    const term3 = -r * K * Math.exp(-r * Tpos) * WorkerMathUtils.cdf(d2);
    return term1 + term2 + term3;
  }

  vanna({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sigma: boundedSigma } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const sqrtT = Math.sqrt(Tpos);
    return Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * sqrtT * (1 - d1 / (boundedSigma * sqrtT));
  }

  charm({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sigma: boundedSigma } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const sqrtT = Math.sqrt(Tpos);
    const termA = -q * Math.exp(-q * Tpos) * WorkerMathUtils.cdf(d1);
    const termB = -Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) *
      ((2 * (r - q) * Tpos - d2 * boundedSigma * sqrtT) / (2 * Tpos * boundedSigma * sqrtT + 1e-300));
    return termA + termB;
  }

  vomma({ S, K, T, sigma, r, q }) {
    const { d1, d2, sigma: boundedSigma, Tpos } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const vega = this.vega({ S, K, T: Tpos, sigma: boundedSigma, r, q });
    return vega * d1 * d2 / (boundedSigma + 1e-300);
  }

  speed({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sigma: boundedSigma } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const gamma = this.gamma({ S, K, T: Tpos, sigma: boundedSigma, r, q });
    const sqrtT = Math.sqrt(Tpos);
    return -gamma / (S + 1e-300) * (1 + d1 / (boundedSigma * sqrtT + 1e-300));
  }

  zomma({ S, K, T, sigma, r, q }) {
    const { d1, d2, sigma: boundedSigma, Tpos } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const gamma = this.gamma({ S, K, T: Tpos, sigma: boundedSigma, r, q });
    return gamma * (d1 * d2 - 1) / (boundedSigma + 1e-300);
  }

  veta({ S, K, T, sigma, r, q }) {
    const { d1, d2, sigma: boundedSigma, Tpos } = this.model.computeD1D2(S, K, T, sigma, r, q);
    const vega = this.vega({ S, K, T: Tpos, sigma: boundedSigma, r, q });
    const sqrtT = Math.sqrt(Tpos);
    const term = q + ((r - q) * d1 - d2) / (boundedSigma * sqrtT + 1e-300);
    return vega * term;
  }
}

const engine = new WorkerGreeksEngine();
const calculators = {
  delta: (args) => engine.delta(args),
  gamma: (args) => engine.gamma(args),
  vega: (args) => engine.vega(args),
  theta: (args) => engine.theta(args),
  vanna: (args) => engine.vanna(args),
  charm: (args) => engine.charm(args),
  vomma: (args) => engine.vomma(args),
  speed: (args) => engine.speed(args),
  zomma: (args) => engine.zomma(args),
  veta: (args) => engine.veta(args),
};

self.onmessage = (event) => {
  const { type, data, requestId } = event.data;

  try {
    if (type === "PING") {
      self.postMessage({ type: "PONG" });
      return;
    }

    if (type !== "COMPUTE_GREEKS") {
      return;
    }

    const { kAxis, tAxis, Kgrid, Fgrid, sigmaGrid, params, greekNames } = data;
    const results = {};

    greekNames.forEach((greekName) => {
      const z = new Array(tAxis.length);

      for (let i = 0; i < tAxis.length; i += 1) {
        z[i] = new Array(kAxis.length);
        for (let j = 0; j < kAxis.length; j += 1) {
          const sigma = sigmaGrid?.[i]?.[j] ?? params.sigma;
          z[i][j] = calculators[greekName]({
            S: Fgrid[i][j],
            K: Kgrid[i][j],
            T: tAxis[i],
            sigma,
            r: params.r,
            q: params.q,
          });
        }
      }

      results[greekName] = z;
    });

    self.postMessage({
      type: "GREEKS_COMPUTED",
      requestId,
      data: results,
    });
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      requestId,
      error: error.message,
    });
  }
};
