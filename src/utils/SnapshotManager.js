// Copyright (c) 2025, Williams.Wang. All rights reserved. Use restricted under LICENSE terms.

// 中文注释：快照管理器，用于参数配置的保存、加载和分享
export class SnapshotManager {
  constructor() {
    this.storageKey = 'allgreeks_snapshots';
    this.maxSnapshots = 10;
  }

  /**
   * 保存当前参数快照
   */
  saveSnapshot(params, name = null) {
    const snapshot = {
      id: this.generateId(),
      name: name || `Snapshot ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      params: { ...params },
      version: '1.0'
    };

    const snapshots = this.loadSnapshots();
    snapshots.unshift(snapshot);
    
    // 限制快照数量
    if (snapshots.length > this.maxSnapshots) {
      snapshots.splice(this.maxSnapshots);
    }

    this.saveToStorage(snapshots);
    return snapshot;
  }

  /**
   * 加载所有快照
   */
  loadSnapshots() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load snapshots:', error);
      return [];
    }
  }

  /**
   * 根据 ID 加载特定快照
   */
  loadSnapshot(id) {
    const snapshots = this.loadSnapshots();
    return snapshots.find(s => s.id === id);
  }

  /**
   * 删除快照
   */
  deleteSnapshot(id) {
    const snapshots = this.loadSnapshots();
    const filtered = snapshots.filter(s => s.id !== id);
    this.saveToStorage(filtered);
    return filtered;
  }

  /**
   * 导出快照为 JSON 字符串
   */
  exportSnapshot(params, name = null) {
    const snapshot = {
      name: name || `AllGreeks Export ${new Date().toISOString()}`,
      timestamp: Date.now(),
      params: { ...params },
      version: '1.0',
      app: 'AllGreeks BSM Visualization'
    };
    
    return JSON.stringify(snapshot, null, 2);
  }

  /**
   * 从 JSON 字符串导入快照
   */
  importSnapshot(jsonString) {
    try {
      const snapshot = JSON.parse(jsonString);
      
      // 验证快照格式
      if (!snapshot.params || !snapshot.version) {
        throw new Error('Invalid snapshot format');
      }
      
      // 验证必要参数
      const requiredParams = ['s0', 'sigma', 'r', 'q'];
      for (const param of requiredParams) {
        if (!(param in snapshot.params)) {
          throw new Error(`Missing required parameter: ${param}`);
        }
      }
      
      return snapshot;
    } catch (error) {
      throw new Error(`Failed to import snapshot: ${error.message}`);
    }
  }

  /**
   * 生成分享链接（URL hash）
   */
  generateShareLink(params) {
    const compressed = this.compressParams(params);
    const hash = btoa(JSON.stringify(compressed));
    return `${window.location.origin}${window.location.pathname}#${hash}`;
  }

  /**
   * 从分享链接解析参数
   */
  parseShareLink() {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) return null;
      
      const compressed = JSON.parse(atob(hash));
      return this.decompressParams(compressed);
    } catch (error) {
      console.warn('Failed to parse share link:', error);
      return null;
    }
  }

  /**
   * 压缩参数（减少 URL 长度）
   */
  compressParams(params) {
    return {
      s: params.s0,
      v: Math.round(params.sigma * 1000), // 保留 3 位小数
      r: Math.round(params.r * 1000),
      q: Math.round(params.q * 1000),
      p: params.preset === 'shock' ? 1 : 0,
      t: params.theme === 'light' ? 1 : 0,
      z: params.zlock ? 1 : 0,
      m: params.marketFlavor ? 1 : 0
    };
  }

  /**
   * 解压缩参数
   */
  decompressParams(compressed) {
    return {
      s0: compressed.s || 500,
      sigma: (compressed.v || 200) / 1000,
      r: (compressed.r || 40) / 1000,
      q: (compressed.q || 15) / 1000,
      preset: compressed.p === 1 ? 'shock' : 'normal',
      theme: compressed.t === 1 ? 'light' : 'dark',
      zlock: compressed.z === 1,
      marketFlavor: compressed.m === 1
    };
  }

  /**
   * 创建预设快照
   */
  createPresets() {
    const presets = [
      {
        name: 'Default Teaching',
        params: { s0: 500, sigma: 0.20, r: 0.04, q: 0.015, preset: 'normal', theme: 'dark', zlock: false, marketFlavor: false }
      },
      {
        name: 'High Volatility Crisis',
        params: { s0: 500, sigma: 0.35, r: 0.02, q: 0.01, preset: 'shock', theme: 'dark', zlock: false, marketFlavor: false }
      },
      {
        name: 'Low Rate Environment',
        params: { s0: 500, sigma: 0.15, r: 0.005, q: 0.02, preset: 'normal', theme: 'light', zlock: true, marketFlavor: false }
      },
      {
        name: 'Market Flavor Demo',
        params: { s0: 500, sigma: 0.22, r: 0.035, q: 0.018, preset: 'normal', theme: 'dark', zlock: false, marketFlavor: true }
      }
    ];

    return presets;
  }

  /**
   * 保存到本地存储
   */
  saveToStorage(snapshots) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(snapshots));
    } catch (error) {
      console.warn('Failed to save snapshots:', error);
    }
  }

  /**
   * 生成唯一 ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 清理过期快照
   */
  cleanup(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 天
    const snapshots = this.loadSnapshots();
    const now = Date.now();
    const filtered = snapshots.filter(s => now - s.timestamp < maxAge);
    
    if (filtered.length < snapshots.length) {
      this.saveToStorage(filtered);
      console.log(`Cleaned up ${snapshots.length - filtered.length} expired snapshots`);
    }
    
    return filtered;
  }
}
