// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：网格生成与辅助计算函数

export class GridGenerator {
  /** 生成线性序列 */
  linspace(minV, maxV, n) {
    const arr = new Array(n);
    const step = (maxV - minV) / (n - 1);
    for (let i = 0; i < n; i++) arr[i] = minV + i * step;
    return arr;
  }

  /** 根据 (k, T) 轴生成 K 与远期 F 的网格 */
  generateKTGrid({ s0, r, q, kMin, kMax, tMin, tMax, nk, nt }) {
    const kAxis = this.linspace(kMin, kMax, nk);
    const tAxis = this.linspace(tMin, tMax, nt);
    const Kgrid = new Array(nt);
    const Fgrid = new Array(nt);
    for (let i = 0; i < nt; i++) {
      const T = tAxis[i];
      const F = s0 * Math.exp((r - q) * T);
      Kgrid[i] = new Array(nk);
      Fgrid[i] = new Array(nk);
      for (let j = 0; j < nk; j++) {
        const k = kAxis[j];
        const K = Math.exp(k) * F;
        Kgrid[i][j] = K;
        Fgrid[i][j] = F; // 用 F 作为“等价 S”计算 Greeks，更稳定
      }
    }
    return { kAxis, tAxis, Kgrid, Fgrid };
  }

  /** 常数 sigma 填充网格（Base） */
  fillSigmaGrid({ nt, nk, value }) {
    const grid = new Array(nt);
    for (let i = 0; i < nt; i++) {
      grid[i] = new Array(nk).fill(value);
    }
    return grid;
  }

  /**
   * 遍历二维网格 (nt x nk) 并映射到 z 值
   */
  mapOverGrid(fn, nt, nk) {
    const z = new Array(nt);
    for (let i = 0; i < nt; i++) {
      z[i] = new Array(nk);
      for (let j = 0; j < nk; j++) {
        z[i][j] = fn(i, j);
      }
    }
    return z;
  }
}


