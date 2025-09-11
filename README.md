# AllGreeks - BSM 希腊字母 3D 可视化 (Advanced)

BSM 框架下的希腊字母 3D 交互可视化项目，包含完整的 Base + Advanced 功能实现。

## 功能特性

### Level 1 希腊字母
- **Delta**: 价格敏感度 (∂C/∂S)
- **Gamma**: Delta 的变化率 (∂²C/∂S²)
- **Vega**: 波动率敏感度 (∂C/∂σ)
- **Theta**: 时间衰减 (∂C/∂t, 按年显示)

### Level 2 希腊字母 (完整实现)
- **Vanna**: ∂²C/(∂S∂σ) - 交叉敏感度
- **Charm**: ∂Delta/∂t - Delta 的时间衰减
- **Vomma (Volga)**: ∂Vega/∂σ - Vega 的波动率敏感度
- **Speed**: ∂Gamma/∂S - Gamma 的价格敏感度
- **Zomma**: ∂Gamma/∂σ - Gamma 的波动率敏感度
- **Veta**: ∂Vega/∂t - Vega 的时间衰减

### 交互功能
- **参数实时调节**：S₀, σ, r, q
- **期限结构预设**：Normal (上倾) / Shock (倒挂)
- **市场风味模式**：SVI 参数化波动率曲面 vs 常数波动率
- **主题切换**：深色/浅色
- **Z轴锁定**：保持量程一致性便于对比
- **LOD机制**：拖动时低分辨率预览，停止后高分辨率补算
- **Web Worker**：并行计算提升性能
- **导出功能**：PNG截图、JSON参数复制、快照保存、分享链接

### Advanced 功能
- **SVI 波动率曲面**：参数化隐含波动率建模，支持期限结构和微笑形状
- **数值验证**：有限差分交叉验证，边界检查，异常检测
- **快照管理**：本地存储、导入导出、URL分享
- **错误处理**：实时异常监测、浮动提示、全局错误捕获
- **性能优化**：Web Worker并行计算、智能LOD、内存优化

### 自检图表
- ATM期限结构：展示不同预设下的波动率曲线
- 微笑切片：固定期限下的波动率分布

## 技术实现

- **前端框架**: 原生 ES6 模块
- **3D渲染**: Plotly.js (WebGL)
- **数值稳定性**: 解析式希腊字母计算，带边界裁剪
- **响应式设计**: 支持深色/浅色主题

## 本地运行

1. 启动HTTP服务器：
   ```bash
   python3 -m http.server 8080
   ```

2. 打开浏览器访问：
   ```
   http://localhost:8080
   ```

## 项目结构

```
allgreeks/
├── index.html              # 主页面
├── src/
│   ├── app.js              # 应用入口
│   ├── model/
│   │   └── BlackScholesModel.js  # BSM模型与希腊字母
│   ├── grid/
│   │   └── GridGenerator.js      # 网格生成器
│   ├── render/
│   │   └── PlotlyRenderer.js     # Plotly 渲染器
│   ├── ui/
│   │   └── Controls.js           # UI控制器
│   ├── utils/
│   │   └── MathUtils.js          # 数学工具
│   └── styles/
│       └── main.css              # 样式文件
└── docs/
    └── 实验计划.md               # 详细设计文档
```

## 数值稳定性

- T 下界：0.02 年（避免 T→0 奇异性）
- σ 下界：0.05（避免零波动率）
- d₁/d₂ 裁剪：±8 范围内（避免正态分布尾部数值问题）
- 解析式实现：避免数值差分噪声

## 部署准备

项目为纯前端静态资源，可直接部署到：
- Cloudflare Pages
- GitHub Pages
- Netlify
- 任何静态托管服务

## 已完成功能

### Base 阶段 ✅
- [x] 4个一级希腊字母 3D 可视化
- [x] 基础二级希腊字母 (Vanna, Charm, Vomma)
- [x] 参数控制面板和实时交互
- [x] LOD 性能优化
- [x] 2D 自检图表
- [x] 主题切换和导出功能

### Advanced 阶段 ✅
- [x] 完整的6个二级希腊字母 (Speed, Zomma, Veta)
- [x] SVI 参数化波动率曲面
- [x] Web Workers 并行计算
- [x] 数值验证与有限差分交叉检验
- [x] 快照管理和分享链接
- [x] 错误处理和异常检测
- [x] 市场风味模式切换

## 部署状态

项目已完成全部计划功能，可立即部署到生产环境。
