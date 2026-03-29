// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：UI 控制器，管理参数面板的交互与事件。
import { Debouncer } from "../utils/MathUtils.js";

/**
 * UI 控制器：管理参数面板的交互与事件
 */
export class UIController {
  /**
   * @param {HTMLElement} controlsEl 控件容器
   * @param {object} initialState 初始状态
   */
  constructor(controlsEl, initialState) {
    this.controlsEl = controlsEl;
    this.state = { ...initialState };
    this.debouncer = new Debouncer(260);
    this.onChangeImmediateCb = null;
    this.onChangeSettledCb = null;

    this._bindControls();
    this._syncOutputs();
  }

  /**
   * 绑定所有控件事件
   */
  _bindControls() {
    const numericInputs = ["s0", "sigma", "r", "q"];
    numericInputs.forEach((key) => {
      const input = document.getElementById(key);
      if (!input) {
        return;
      }

      const commitValue = () => {
        const parsedValue = this._parseInputValue(key, input.value);
        if (parsedValue === null) {
          this._applyStateToInput(key, input);
          return;
        }

        this.state[key] = parsedValue;
        this._applyStateToInput(key, input);
        this._triggerImmediate();
        this._triggerSettled();
      };

      input.addEventListener("change", commitValue);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          input.blur();
        }
      });
    });

    ["preset", "theme"].forEach((key) => {
      const select = document.getElementById(key);
      if (!select) {
        return;
      }

      select.addEventListener("change", () => {
        this.state[key] = select.value;
        this._triggerImmediate();
        this._triggerSettled();
      });
    });

    ["zlock", "market_flavor"].forEach((key) => {
      const checkbox = document.getElementById(key);
      if (!checkbox) {
        return;
      }

      checkbox.addEventListener("change", () => {
        if (key === "zlock") {
          this.state.zlock = checkbox.checked;
        }
        if (key === "market_flavor") {
          this.state.marketFlavor = checkbox.checked;
        }
        this._triggerImmediate();
        this._triggerSettled();
      });
    });
  }

  /**
   * 格式化数值显示
   *
   * @param {string} key 参数名
   * @param {number} value 参数值
   * @returns {string} 格式化文本
   */
  _formatInputValue(key, value) {
    if (key === "s0") {
      return value.toFixed(0);
    }
    return (value * 100).toFixed(1);
  }

  /**
   * 将当前状态回写到输入框
   *
   * @param {string} key 参数名
   * @param {HTMLInputElement} input 输入框
   */
  _applyStateToInput(key, input) {
    input.value = this._formatInputValue(key, this.state[key]);
  }

  /**
   * 解析输入框数值
   *
   * @param {string} key 参数名
   * @param {string} rawValue 原始文本
   * @returns {number | null} 解析后的参数值
   */
  _parseInputValue(key, rawValue) {
    const parsed = Number.parseFloat(rawValue);
    if (!Number.isFinite(parsed)) {
      return null;
    }

    const input = document.getElementById(key);
    const minValue = input?.min ? Number.parseFloat(input.min) : Number.NEGATIVE_INFINITY;
    const maxValue = input?.max ? Number.parseFloat(input.max) : Number.POSITIVE_INFINITY;
    const clamped = Math.min(Math.max(parsed, minValue), maxValue);

    if (key === "s0") {
      return clamped;
    }

    return clamped / 100;
  }

  /**
   * 同步所有输入框显示
   */
  _syncOutputs() {
    ["s0", "sigma", "r", "q"].forEach((key) => {
      const input = document.getElementById(key);
      if (input) {
        this._applyStateToInput(key, input);
      }
    });
  }

  /**
   * 触发即时回调（LOD 预览）
   */
  _triggerImmediate() {
    if (this.onChangeImmediateCb) {
      this.onChangeImmediateCb();
    }
  }

  /**
   * 触发延迟回调（高分辨率重算）
   */
  _triggerSettled() {
    if (this.onChangeSettledCb) {
      this.debouncer.run(this.onChangeSettledCb);
    }
  }

  /**
   * 注册即时变化回调
   *
   * @param {Function} callback 回调函数
   */
  onChangeImmediate(callback) {
    this.onChangeImmediateCb = callback;
  }

  /**
   * 注册延迟变化回调
   *
   * @param {Function} callback 回调函数
   */
  onChangeSettled(callback) {
    this.onChangeSettledCb = callback;
  }

  /**
   * 获取当前参数
   *
   * @returns {object} 参数快照
   */
  getParams() {
    return { ...this.state };
  }

  /**
   * 从状态同步到 UI 控件
   *
   * @param {object} newState 新状态
   */
  syncFromState(newState) {
    Object.assign(this.state, newState);

    ["s0", "sigma", "r", "q"].forEach((key) => {
      const input = document.getElementById(key);
      if (input && this.state[key] !== undefined) {
        this._applyStateToInput(key, input);
      }
    });

    ["preset", "theme"].forEach((key) => {
      const select = document.getElementById(key);
      if (select && this.state[key] !== undefined) {
        select.value = this.state[key];
      }
    });

    ["zlock", "marketFlavor"].forEach((key) => {
      const domId = key === "marketFlavor" ? "market_flavor" : key;
      const checkbox = document.getElementById(domId);
      if (checkbox && typeof this.state[key] === "boolean") {
        checkbox.checked = this.state[key];
      }
    });

    this._syncOutputs();
  }
}
