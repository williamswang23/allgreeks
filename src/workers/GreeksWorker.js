// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：Greeks 计算 Web Worker，用于并行网格计算

// Worker 中需要重新定义必要的数学函数
class WorkerMathUtils {
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
  static pdf(x) {
    const xx = x * x;
    return Math.exp(-0.5 * xx) / Math.sqrt(2 * Math.PI);
  }

  static cdf(x) {
    const z = Math.max(-8, Math.min(8, x));
    return 0.5 * (1 + WorkerMathUtils.erf(z / Math.SQRT2));
  }

  static clamp(x, minV, maxV) {
    return Math.max(minV, Math.min(maxV, x));
  }
}

class WorkerBSMModel {
  constructor() {
    this.tMin = 0.02;
    this.sigmaMin = 0.05;
    this.maxAbsD = 8.0;
  }

  computeD1D2(S, K, T, sigma, r, q) {
    const Tpos = Math.max(this.tMin, T);
    const sig = Math.max(this.sigmaMin, sigma);
    const volSqrtT = sig * Math.sqrt(Tpos);
    const logM = Math.log((S + 1e-300) / (K + 1e-300));
    const d1 = (logM + (r - q + 0.5 * sig * sig) * Tpos) / (volSqrtT + 1e-300);
    const d2 = d1 - volSqrtT;
    const d1c = WorkerMathUtils.clamp(d1, -this.maxAbsD, this.maxAbsD);
    const d2c = WorkerMathUtils.clamp(d2, -this.maxAbsD, this.maxAbsD);
    return { d1: d1c, d2: d2c, Tpos, sig };
  }
}

class WorkerGreeksEngine {
  constructor() {
    this.m = new WorkerBSMModel();
  }

  deltaCall({ S, K, T, sigma, r, q }) {
    const { d1, Tpos } = this.m.computeD1D2(S, K, T, sigma, r, q);
    return Math.exp(-q * Tpos) * WorkerMathUtils.cdf(d1);
  }

  gamma({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const denom = (S * sig * Math.sqrt(Tpos)) + 1e-300;
    return Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) / denom;
  }

  vega({ S, K, T, sigma, r, q }) {
    const { d1, Tpos } = this.m.computeD1D2(S, K, T, sigma, r, q);
    return S * Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * Math.sqrt(Tpos);
  }

  thetaCallPerYear({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const term1 = -(S * Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * sig) / (2 * Math.sqrt(Tpos));
    const term2 = q * S * Math.exp(-q * Tpos) * WorkerMathUtils.cdf(d1);
    const term3 = -r * K * Math.exp(-r * Tpos) * WorkerMathUtils.cdf(d2);
    return term1 + term2 + term3;
  }

  vanna({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const sqrtT = Math.sqrt(Tpos);
    return Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * sqrtT * (1 - d1 / (sig * sqrtT));
  }

  charmCall({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const sqrtT = Math.sqrt(Tpos);
    const termA = -q * Math.exp(-q * Tpos) * WorkerMathUtils.cdf(d1);
    const termB = -Math.exp(-q * Tpos) * WorkerMathUtils.pdf(d1) * ((2 * (r - q) * Tpos - d2 * sig * sqrtT) / (2 * Tpos * sig * sqrtT + 1e-300));
    return termA + termB;
  }

  vomma({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const v = this.vega({ S, K, T: Tpos, sigma: sig, r, q });
    return v * d1 * d2 / (sig + 1e-300);
  }

  speed({ S, K, T, sigma, r, q }) {
    const { d1, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const gamma = this.gamma({ S, K, T: Tpos, sigma: sig, r, q });
    const sqrtT = Math.sqrt(Tpos);
    return -gamma / (S + 1e-300) * (1 + d1 / (sig * sqrtT + 1e-300));
  }

  zomma({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const gamma = this.gamma({ S, K, T: Tpos, sigma: sig, r, q });
    return gamma * (d1 * d2 - 1) / (sig + 1e-300);
  }

  veta({ S, K, T, sigma, r, q }) {
    const { d1, d2, Tpos, sig } = this.m.computeD1D2(S, K, T, sigma, r, q);
    const vega = this.vega({ S, K, T: Tpos, sigma: sig, r, q });
    const sqrtT = Math.sqrt(Tpos);
    const term = q + ((r - q) * d1 - d2) / (sig * sqrtT + 1e-300);
    return vega * term;
  }
}

// Worker 消息处理
const greeksEngine = new WorkerGreeksEngine();

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    if (type === 'COMPUTE_GREEKS') {
      const { kAxis, tAxis, Kgrid, Fgrid, params, greekNames } = data;
      const results = {};
      
      // 计算每个希腊字母
      for (const greekName of greekNames) {
        const z = new Array(tAxis.length);
        
        for (let i = 0; i < tAxis.length; i++) {
          z[i] = new Array(kAxis.length);
          for (let j = 0; j < kAxis.length; j++) {
            const args = {
              S: Fgrid[i][j],
              K: Kgrid[i][j],
              T: tAxis[i],
              sigma: params.sigma,
              r: params.r,
              q: params.q
            };
            
            // 调用对应的希腊字母计算方法
            switch (greekName) {
              case 'delta':
                z[i][j] = greeksEngine.deltaCall(args);
                break;
              case 'gamma':
                z[i][j] = greeksEngine.gamma(args);
                break;
              case 'vega':
                z[i][j] = greeksEngine.vega(args);
                break;
              case 'theta':
                z[i][j] = greeksEngine.thetaCallPerYear(args);
                break;
              case 'vanna':
                z[i][j] = greeksEngine.vanna(args);
                break;
              case 'charm':
                z[i][j] = greeksEngine.charmCall(args);
                break;
              case 'vomma':
                z[i][j] = greeksEngine.vomma(args);
                break;
              case 'speed':
                z[i][j] = greeksEngine.speed(args);
                break;
              case 'zomma':
                z[i][j] = greeksEngine.zomma(args);
                break;
              case 'veta':
                z[i][j] = greeksEngine.veta(args);
                break;
              default:
                z[i][j] = 0;
            }
          }
        }
        
        results[greekName] = z;
      }
      
      // 发送计算结果
      self.postMessage({
        type: 'GREEKS_COMPUTED',
        data: results
      });
      
    } else if (type === 'PING') {
      self.postMessage({ type: 'PONG' });
    }
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
};
