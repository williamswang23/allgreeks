// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：UI 控制器，管理参数滑杆与事件绑定
import { Debouncer } from "../utils/MathUtils.js";

/**
 * UI 控制器：管理参数面板的交互与事件
 */
export class UIController {
  /**
   * @param {HTMLElement} controlsEl 控制面板容器
   * @param {Object} initialState 初始状态
   */
  constructor(controlsEl, initialState) {
    this.controlsEl = controlsEl;
    this.state = { ...initialState };
    this.debouncer = new Debouncer(300);
    
    // 事件回调
    this.onChangeImmediateCb = null;
    this.onChangeSettledCb = null;
    
    this._bindControls();
    this._syncOutputs();
  }

  /**
   * 绑定所有控件事件
   */
  _bindControls() {
    // 数值滑杆
    const sliders = ["s0", "sigma", "r", "q"];
    sliders.forEach((key) => {
      const slider = document.getElementById(key);
      const output = document.getElementById(`${key}_out`);
      if (!slider || !output) return;
      
      slider.addEventListener("input", () => {
        const val = parseFloat(slider.value);
        this.state[key] = val;
        output.textContent = this._formatValue(key, val);
        this._triggerImmediate();
      });
      
      slider.addEventListener("change", () => {
        this._triggerSettled();
      });
    });

    // 下拉选择
    const selects = ["preset", "theme"];
    selects.forEach((key) => {
      const select = document.getElementById(key);
      if (!select) return;
      
      select.addEventListener("change", () => {
        this.state[key] = select.value;
        this._triggerImmediate();
        this._triggerSettled();
      });
    });

    // 复选框
    const checkboxes = ["zlock", "market_flavor"];
    checkboxes.forEach((key) => {
      const checkbox = document.getElementById(key);
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          // 仅处理这两个字段，避免误伤其它 key
          if (key === 'zlock') this.state.zlock = checkbox.checked;
          if (key === 'market_flavor') this.state.marketFlavor = checkbox.checked;
          this._triggerImmediate();
          this._triggerSettled();
        });
      }
    });
  }

  /**
   * 同步输出显示
   */
  _syncOutputs() {
    const outputs = ["s0", "sigma", "r", "q"];
    outputs.forEach((key) => {
      const output = document.getElementById(`${key}_out`);
      if (output) {
        output.textContent = this._formatValue(key, this.state[key]);
      }
    });
  }

  /**
   * 格式化数值显示
   */
  _formatValue(key, val) {
    if (key === "s0") return val.toString();
    return val.toFixed(3);
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
   * 触发延迟回调（高分辨率）
   */
  _triggerSettled() {
    if (this.onChangeSettledCb) {
      this.debouncer.run(this.onChangeSettledCb);
    }
  }

  /**
   * 注册即时变化回调
   */
  onChangeImmediate(callback) {
    this.onChangeImmediateCb = callback;
  }

  /**
   * 注册延迟变化回调
   */
  onChangeSettled(callback) {
    this.onChangeSettledCb = callback;
  }

  /**
   * 获取当前参数
   */
  getParams() {
    return { ...this.state };
  }

  /**
   * 从状态同步到 UI 控件
   */
  syncFromState(newState) {
    Object.assign(this.state, newState);
    
    // 同步滑杆
    const sliders = ["s0", "sigma", "r", "q"];
    sliders.forEach((key) => {
      const slider = document.getElementById(key);
      if (slider && this.state[key] !== undefined) {
        slider.value = this.state[key];
      }
    });

    // 同步下拉选择
    const selects = ["preset", "theme"];
    selects.forEach((key) => {
      const select = document.getElementById(key);
      if (select && this.state[key] !== undefined) {
        select.value = this.state[key];
      }
    });

    // 同步复选框
    const checkboxes = ["zlock", "marketFlavor"];
    checkboxes.forEach((key) => {
      const domId = key === "marketFlavor" ? "market_flavor" : key;
      const checkbox = document.getElementById(domId);
      if (checkbox && typeof this.state[key] === 'boolean') {
        checkbox.checked = !!this.state[key];
      }
    });

    // 更新输出显示
    this._syncOutputs();
  }
}