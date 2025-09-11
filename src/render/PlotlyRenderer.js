// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

/**
 * 渲染器：封装 Plotly 3D Surface 与 2D 折线绘制
 */
export class PlotlyRenderer {
  constructor() {
    /** 为每个容器记录 z 轴锁定范围 */
    this.zRanges = new Map();
  }

  /** 渲染 3D Surface */
  renderSurface({ containerId, kAxis, tAxis, z, title, zlock }) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const data = [{
      type: "surface",
      x: kAxis,
      y: tAxis,
      z: z,
      colorscale: "Viridis",
      showscale: true,
      contours: { z: { show: true, usecolormap: true, highlightcolor: "#42f462", project: { z: true } } },
    }];

    const zRange = this._getZRange(containerId, z, zlock);
    const isLight = document.body.classList.contains("light");

    const layout = {
      title: { text: title, font: { size: 14 } },
      margin: { l: 0, r: 0, t: 30, b: 0 },
      paper_bgcolor: isLight ? "#ffffff" : "#0f172a",
      plot_bgcolor: isLight ? "#ffffff" : "#0f172a",
      scene: {
        xaxis: { title: "k = ln(K/F(T))", gridcolor: isLight ? "#e5e7eb" : "#374151", zerolinecolor: "#6b7280" },
        yaxis: { title: "T (years)", gridcolor: isLight ? "#e5e7eb" : "#374151", zerolinecolor: "#6b7280" },
        zaxis: { title: "value", gridcolor: isLight ? "#e5e7eb" : "#374151", range: zRange?.range, autorange: zRange?.autorange ?? true },
      },
    };

    const config = { responsive: true, displayModeBar: true };
    Plotly.react(el, data, layout, config);
  }

  /** 渲染 2D 折线图，用于自检 */
  renderLineChart({ containerId, x, series, title, xTitle, yTitle }) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const traces = series.map((s) => ({ x, y: s.y, mode: "lines", name: s.name }));
    const isLight = document.body.classList.contains("light");
    const layout = {
      title: { text: title, font: { size: 13 } },
      margin: { l: 40, r: 8, t: 30, b: 40 },
      paper_bgcolor: isLight ? "#ffffff" : "#0f172a",
      plot_bgcolor: isLight ? "#ffffff" : "#0f172a",
      xaxis: { title: xTitle, gridcolor: isLight ? "#e5e7eb" : "#374151" },
      yaxis: { title: yTitle, gridcolor: isLight ? "#e5e7eb" : "#374151" },
    };
    Plotly.react(el, traces, layout, { responsive: true, displayModeBar: true });
  }

  /** 重置所有 3D 视角 */
  resetViews() {
    document.querySelectorAll(".plot").forEach((el) => {
      try { Plotly.relayout(el, { scene: { camera: { eye: { x: 1.25, y: 1.25, z: 1.25 } } } }); } catch {}
    });
  }

  /** 批量导出 PNG */
  async exportPNGs(containerIds) {
    for (const id of containerIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      try {
        await Plotly.downloadImage(el, { format: "png", filename: id });
      } catch {}
    }
  }

  /**
   * 计算或复用 z 轴范围
   */
  _getZRange(containerId, z, zlock) {
    if (!zlock) {
      this.zRanges.delete(containerId);
      return { autorange: true };
    }
    if (!this.zRanges.has(containerId)) {
      let minV = Infinity, maxV = -Infinity;
      for (let i = 0; i < z.length; i++) {
        for (let j = 0; j < z[i].length; j++) {
          const v = z[i][j];
          if (Number.isFinite(v)) {
            if (v < minV) minV = v;
            if (v > maxV) maxV = v;
          }
        }
      }
      if (!Number.isFinite(minV) || !Number.isFinite(maxV)) {
        return { autorange: true };
      }
      this.zRanges.set(containerId, [minV, maxV]);
    }
    const [minV, maxV] = this.zRanges.get(containerId);
    return { autorange: false, range: [minV, maxV] };
  }
}


