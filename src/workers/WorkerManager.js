// Copyright (c) 2026, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：Web Worker 管理器，统一处理并行计算调度。
export class WorkerManager {
  constructor() {
    this.worker = null;
    this.isWorkerSupported = typeof Worker !== "undefined";
    this.pendingCallbacks = new Map();
    this.requestId = 0;
  }

  /**
   * 初始化 Worker
   *
   * @returns {Promise<boolean>} 是否初始化成功
   */
  async init() {
    if (!this.isWorkerSupported) {
      console.warn("Web Workers not supported, falling back to main thread.");
      return false;
    }

    try {
      this.worker = new Worker(new URL("./GreeksWorker.js", import.meta.url), { type: "module" });
      this.worker.onmessage = this._handleMessage.bind(this);
      this.worker.onerror = this._handleError.bind(this);
      return await this._pingWorker();
    } catch (error) {
      console.warn("Failed to initialize Worker:", error);
      return false;
    }
  }

  /**
   * 测试 Worker 连通性
   *
   * @returns {Promise<boolean>} 是否可用
   */
  _pingWorker() {
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), 1000);

      const handler = (event) => {
        if (event.data.type === "PONG") {
          window.clearTimeout(timeout);
          this.worker.removeEventListener("message", handler);
          resolve(true);
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage({ type: "PING" });
    });
  }

  /**
   * 处理 Worker 消息
   *
   * @param {MessageEvent} event Worker 消息
   */
  _handleMessage(event) {
    const { type, data, error, requestId } = event.data;
    if (type === "PONG") {
      return;
    }

    const callback = this.pendingCallbacks.get(requestId);
    if (!callback) {
      return;
    }

    if (type === "GREEKS_COMPUTED") {
      callback(null, data);
      this.pendingCallbacks.delete(requestId);
      return;
    }

    if (type === "ERROR") {
      callback(new Error(error), null);
      this.pendingCallbacks.delete(requestId);
    }
  }

  /**
   * 处理 Worker 错误
   *
   * @param {ErrorEvent} error Worker 错误
   */
  _handleError(error) {
    console.error("Worker error:", error);
    this.pendingCallbacks.forEach((callback) => {
      callback(error, null);
    });
    this.pendingCallbacks.clear();
  }

  /**
   * 计算希腊字母
   *
   * @param {object} payload 输入参数
   * @returns {Promise<Record<string, number[][]>>} 计算结果
   */
  async computeGreeks(payload) {
    if (!this.worker) {
      throw new Error("Worker not initialized");
    }

    return new Promise((resolve, reject) => {
      const requestId = this.requestId + 1;
      this.requestId = requestId;

      this.pendingCallbacks.set(requestId, (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });

      this.worker.postMessage({
        type: "COMPUTE_GREEKS",
        requestId,
        data: payload,
      });
    });
  }

  /**
   * 释放 Worker 资源
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingCallbacks.clear();
  }
}
