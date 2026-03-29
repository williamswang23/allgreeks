// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：渲染器，封装 Plotly 3D Surface 与 2D 自检图表绘制。
const CAMERA_PRESETS = {
  perspective: { eye: { x: 1.55, y: 1.62, z: 0.95 } },
  top: { eye: { x: 0.01, y: 0.01, z: 2.45 } },
  side: { eye: { x: 2.3, y: 0.01, z: 0.28 } },
};

const COLOR_SCALES = {
  diverging: [
    [0, "#1D5F8C"],
    [0.5, "#E7EEF5"],
    [1, "#D9A441"],
  ],
  sequential: [
    [0, "#132238"],
    [0.35, "#1D5F8C"],
    [0.7, "#27B3A7"],
    [1, "#E7EEF5"],
  ],
};

/**
 * Plotly 渲染器
 */
export class PlotlyRenderer {
  constructor() {
    this.zRanges = new Map();
  }

  /**
   * 渲染 3D Surface
   *
   * @param {object} options 渲染参数
   * @returns {{ min: number, max: number }} 区间摘要
   */
  renderSurface({ containerId, kAxis, tAxis, z, title, zAxisLabel, colorScale, zlock, cameraMode }) {
    const element = document.getElementById(containerId);
    if (!element) {
      return { min: Number.NaN, max: Number.NaN };
    }

    const theme = this._getTheme();
    const rangeInfo = this._measureRange(z);
    const zRange = this._getZRange(containerId, z, zlock);

    const data = [
      {
        type: "surface",
        x: kAxis,
        y: tAxis,
        z,
        colorscale: COLOR_SCALES[colorScale] ?? COLOR_SCALES.sequential,
        showscale: false,
        contours: {
          z: {
            show: true,
            usecolormap: true,
            project: { z: true },
            color: theme.contour,
          },
        },
      },
    ];

    const layout = {
      title: {
        text: title,
        x: 0.03,
        font: {
          family: "Space Grotesk, sans-serif",
          size: 18,
          color: theme.text,
        },
      },
      autosize: true,
      uirevision: containerId,
      margin: { l: 0, r: 0, t: 50, b: 0 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: theme.text, family: "Space Grotesk, sans-serif" },
      scene: {
        bgcolor: theme.scene,
        camera: CAMERA_PRESETS[cameraMode] ?? CAMERA_PRESETS.perspective,
        xaxis: this._axisStyle("k = ln(K/F(T))", theme),
        yaxis: this._axisStyle("T (years)", theme),
        zaxis: {
          ...this._axisStyle(zAxisLabel, theme),
          range: zRange.range,
          autorange: zRange.autorange,
        },
      },
    };

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "toImage"],
    };

    Plotly.react(element, data, layout, config);
    return rangeInfo;
  }

  /**
   * 渲染 2D 折线图
   *
   * @param {object} options 渲染参数
   */
  renderLineChart({ containerId, x, series, title, xTitle, yTitle }) {
    const element = document.getElementById(containerId);
    if (!element) {
      return;
    }

    const theme = this._getTheme();
    const traces = series.map((item) => ({
      x,
      y: item.y,
      type: "scatter",
      mode: "lines",
      name: item.name,
      line: {
        color: item.color,
        width: 2.8,
      },
    }));

    const layout = {
      title: {
        text: title,
        x: 0.03,
        font: {
          family: "Space Grotesk, sans-serif",
          size: 17,
          color: theme.text,
        },
      },
      autosize: true,
      margin: { l: 52, r: 18, t: 48, b: 48 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: theme.scene,
      font: { color: theme.text, family: "Space Grotesk, sans-serif" },
      legend: {
        orientation: "h",
        y: 1.15,
        x: 0,
        font: { family: "IBM Plex Mono, monospace", size: 11, color: theme.softText },
      },
      xaxis: {
        title: {
          text: xTitle,
          font: { family: "IBM Plex Mono, monospace", size: 11, color: theme.softText },
        },
        gridcolor: theme.grid,
        zerolinecolor: theme.grid,
        tickfont: { family: "IBM Plex Mono, monospace", size: 11, color: theme.softText },
      },
      yaxis: {
        title: {
          text: yTitle,
          font: { family: "IBM Plex Mono, monospace", size: 11, color: theme.softText },
        },
        gridcolor: theme.grid,
        zerolinecolor: theme.grid,
        tickfont: { family: "IBM Plex Mono, monospace", size: 11, color: theme.softText },
      },
    };

    Plotly.react(element, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "toImage"],
    });
  }

  /**
   * 批量导出 PNG
   *
   * @param {string[]} containerIds 容器 ID 列表
   */
  async exportPNGs(containerIds) {
    for (const containerId of containerIds) {
      const element = document.getElementById(containerId);
      if (!element) {
        continue;
      }
      try {
        await Plotly.downloadImage(element, { format: "png", filename: containerId });
      } catch (error) {
        console.warn(`Failed to export ${containerId}:`, error);
      }
    }
  }

  /**
   * 设置指定图表视角
   *
   * @param {string} containerId 容器 ID
   * @param {string} cameraMode 视角模式
   */
  setCamera(containerId, cameraMode) {
    const element = document.getElementById(containerId);
    const camera = CAMERA_PRESETS[cameraMode];
    if (!element || !camera) {
      return;
    }

    try {
      Plotly.relayout(element, { "scene.camera": camera });
    } catch (error) {
      console.warn(`Failed to update camera for ${containerId}:`, error);
    }
  }

  /**
   * 重置 3D 视角
   *
   * @param {string[]} containerIds 容器 ID 列表
   */
  resetViews(containerIds) {
    containerIds.forEach((containerId) => {
      this.setCamera(containerId, "perspective");
    });
  }

  /**
   * 构建坐标轴样式
   *
   * @param {string} title 坐标轴标题
   * @param {object} theme 主题色
   * @returns {object} Plotly 坐标轴样式
   */
  _axisStyle(title, theme) {
    return {
      title: {
        text: title,
        font: { family: "IBM Plex Mono, monospace", size: 11, color: theme.softText },
      },
      color: theme.softText,
      gridcolor: theme.grid,
      zerolinecolor: theme.grid,
      tickfont: { family: "IBM Plex Mono, monospace", size: 10, color: theme.softText },
    };
  }

  /**
   * 获取当前主题色
   *
   * @returns {object} 主题色对象
   */
  _getTheme() {
    const isLight = document.body.classList.contains("light");
    return isLight
      ? {
          text: "#132238",
          softText: "#32516D",
          scene: "#F7F9FC",
          grid: "#D2DBE6",
          contour: "#1C9A8F",
        }
      : {
          text: "#E7EEF5",
          softText: "#C8D6E4",
          scene: "#0F1828",
          grid: "#213247",
          contour: "#27B3A7",
        };
  }

  /**
   * 计算或复用 z 轴范围
   *
   * @param {string} containerId 容器 ID
   * @param {number[][]} z 曲面值
   * @param {boolean} zlock 是否锁定
   * @returns {{ autorange: boolean, range?: number[] }} 范围信息
   */
  _getZRange(containerId, z, zlock) {
    if (!zlock) {
      this.zRanges.delete(containerId);
      return { autorange: true };
    }

    if (!this.zRanges.has(containerId)) {
      const measured = this._measureRange(z);
      if (!Number.isFinite(measured.min) || !Number.isFinite(measured.max)) {
        return { autorange: true };
      }
      this.zRanges.set(containerId, [measured.min, measured.max]);
    }

    const [min, max] = this.zRanges.get(containerId);
    return { autorange: false, range: [min, max] };
  }

  /**
   * 测量曲面最小值与最大值
   *
   * @param {number[][]} z 曲面值
   * @returns {{ min: number, max: number }} 区间信息
   */
  _measureRange(z) {
    let min = Infinity;
    let max = -Infinity;

    z.forEach((row) => {
      row.forEach((value) => {
        if (!Number.isFinite(value)) {
          return;
        }
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
    });

    return { min, max };
  }
}
