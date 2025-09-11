// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：Web Worker 管理器，处理并行计算调度
export class WorkerManager {
  constructor() {
    this.worker = null;
    this.isWorkerSupported = typeof Worker !== 'undefined';
    this.pendingCallbacks = new Map();
    this.requestId = 0;
  }

  /**
   * 初始化 Worker
   */
  async init() {
    if (!this.isWorkerSupported) {
      console.warn('Web Workers not supported, falling back to main thread');
      return false;
    }

    try {
      this.worker = new Worker('./src/workers/GreeksWorker.js');
      this.worker.onmessage = this._handleMessage.bind(this);
      this.worker.onerror = this._handleError.bind(this);
      
      // 测试 Worker 是否正常工作
      return await this._pingWorker();
    } catch (error) {
      console.warn('Failed to initialize Worker:', error);
      return false;
    }
  }

  /**
   * 测试 Worker 连通性
   */
  _pingWorker() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);
      
      const handler = (e) => {
        if (e.data.type === 'PONG') {
          clearTimeout(timeout);
          this.worker.removeEventListener('message', handler);
          resolve(true);
        }
      };
      
      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ type: 'PING' });
    });
  }

  /**
   * 处理 Worker 消息
   */
  _handleMessage(e) {
    const { type, data, error } = e.data;
    
    if (type === 'GREEKS_COMPUTED') {
      // 通知所有等待的回调
      this.pendingCallbacks.forEach((callback) => {
        callback(null, data);
      });
      this.pendingCallbacks.clear();
    } else if (type === 'ERROR') {
      this.pendingCallbacks.forEach((callback) => {
        callback(new Error(error), null);
      });
      this.pendingCallbacks.clear();
    }
  }

  /**
   * 处理 Worker 错误
   */
  _handleError(error) {
    console.error('Worker error:', error);
    this.pendingCallbacks.forEach((callback) => {
      callback(error, null);
    });
    this.pendingCallbacks.clear();
  }

  /**
   * 计算希腊字母（异步）
   */
  async computeGreeks({ kAxis, tAxis, Kgrid, Fgrid, params, greekNames }) {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      
      this.pendingCallbacks.set(requestId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });

      this.worker.postMessage({
        type: 'COMPUTE_GREEKS',
        data: { kAxis, tAxis, Kgrid, Fgrid, params, greekNames }
      });
    });
  }

  /**
   * 检查是否支持 Worker
   */
  isSupported() {
    return this.isWorkerSupported && this.worker !== null;
  }

  /**
   * 清理资源
   */
  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingCallbacks.clear();
  }
}
