# Trading Review Dashboard

一个本地运行的交易复盘工作台，面向 NinjaTrader 日报 PDF 导入、交易日志整理、统计分析，以及基于免费历史行情的单日回放。

## 项目目标

这个项目不是券商终端，也不是自动交易系统。它更像一套个人复盘基础设施，解决下面几件事：

- 把 NinjaTrader Daily Statement PDF 解析成结构化交易数据
- 把 session、fills、trades、journal 持久化到本地 SQLite
- 在前端提供概览、日志、分析、复盘、设置五个页面
- 用免费 ES 历史数据把单日交易放回到图表上复看
- 给每笔成交补充理由、给每个交易日补充文字复盘

## 当前功能

### 1. Overview

- 展示账户权益曲线
- 显示总净盈亏、胜率、盈亏比、最大回撤等核心指标
- 列出最近 5 个交易日

### 2. Journal

- 上传 NinjaTrader PDF
- 浏览单个交易日的 fills、trades、journal
- 编辑 trade annotation
- 编辑 fill reason
- 查看当日逐笔盈亏小图和账户汇总

### 3. Analytics

- 权益曲线
- 回撤走势
- 胜率 / 盈亏结构
- 每日盈亏柱状图
- 盈亏分布
- 交易时段热力图
- 多空对比
- 持仓时长分析
- trade-level scatter 数据可视化

### 4. Review

- 选择交易日查看回放
- 拉取并缓存 `ES=F` 免费历史行情
- 支持 `1m / 5m / 15m / 1h / 4h / 1d`
- 在图表上叠加 fills marker
- 显示 VWAP、EMA200、成交量
- 与当日复盘日志联动

### 5. Settings

- 删除某个交易日的本地数据
- 导出当前 `sessions + analytics` 的 JSON 快照

## 技术栈

- 前端：React 18、TypeScript、Vite
- 图表：Recharts、lightweight-charts
- 后端：Express 5
- 存储：better-sqlite3 / SQLite
- 测试：Vitest、Testing Library
- 开发体验：`tsx`、`concurrently`

## 本地运行

### 环境要求

- Node.js 18+，建议 20+
- npm

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

这条命令会同时启动：

- 前端 Vite 开发服务器：`http://localhost:5173`
- 后端 API：`http://localhost:3002`

Vite 已经把 `/api` 代理到 `3002`，前端开发时不需要额外配置。

### 单独启动 API

```bash
npm run server
```

注意：`npm run dev` 已经会启动 API。不要在第二个终端再运行一次 `npm run server`，否则会遇到 `3002` 端口占用。

## 访问控制与生产部署

- 生产服务默认监听 `3002`，可通过 `PORT` 覆盖
- 页面默认启用简单密码门禁，密码环境变量为 `REVIEW_APP_PASSWORD`
- 未配置 `REVIEW_APP_PASSWORD` 时不会开放登录
- 仓库只保留 `deploy/trading-review.service.example`，真实 `deploy/trading-review.service` 已被 `.gitignore` 忽略
- 生产构建后，Express 会直接托管 `dist/`，可以让 Caddy 直接反向代理到该端口

## 常用命令

```bash
npm run dev
npm run server
npm test
npm run build
npm run preview
```

## 数据流

### 1. 导入

前端把 PDF 上传到：

```text
POST /api/sessions/import
```

服务端会：

1. 解析 NinjaTrader PDF
2. 提取 session、fills、trades
3. 把时间标准化为 UTC ISO 字符串
4. 写入 SQLite
5. 返回完整 session detail 给前端刷新 UI

### 2. 统计

分析页使用：

```text
GET /api/analytics
```

后端根据 session 和 trade 数据计算：

- equity curve
- drawdown
- trade stats
- distribution
- heatmap
- streaks
- direction stats
- duration stats

### 3. 回放

复盘页使用：

```text
GET /api/sessions/:date/market?timeframe=1m
```

服务端会：

1. 根据交易日和周期计算历史窗口
2. 读取本地 `market_bars` 缓存
3. 缓存不足时请求 Yahoo Finance 免费历史接口
4. 写回 SQLite
5. 返回 bars + fills 给前端回放图表

## 数据存储

本地数据库默认在：

```text
data/trading.db
```

主要表：

- `sessions`
- `fills`
- `trades`
- `journal_entries`
- `market_bars`

这些文件都被 `.gitignore` 忽略，不会被正常提交。

## 项目结构

```text
src/
  api/                 前端 API client 与数据 normalize
  components/          图表、日志、布局组件
  lib/                 指标、格式化、统计辅助逻辑
  pages/               Overview / Journal / Analytics / Review / Settings
server/
  parsers/             NinjaTrader PDF parser
  routes/              sessions / analytics API
  services/            市场数据抓取与缓存逻辑
  db.ts                SQLite schema 与 CRUD
docs/plans/            过程性设计与实现计划
```

## 已验证内容

当前仓库可通过：

```bash
npm test
npm run build
```

Vitest 覆盖了以下关键路径：

- API client normalize
- sessions / analytics 路由
- NinjaTrader parser
- market data service
- Overview / Journal / Analytics / Review 页面关键交互
- Session replay chart / FillTable / EquityCurve 组件

## 已知限制

- 回放数据当前依赖 Yahoo Finance 免费历史接口，稳定性和覆盖率都不等于付费行情源
- `1m` 数据窗口受免费源限制，需要分段抓取
- 当前回放标的是 `ES=F`，不是完整多品种行情平台
- Settings 导出的 JSON 目前是摘要型快照，不是 SQLite 全量备份
- 本地数据库 schema 迁移目前仍是轻量级写法，适合个人工具，不适合多人协作的正式迁移流程

## 适用场景

- 个人交易复盘
- 手动维护交易日志
- 研究单日执行质量
- 用低成本方式搭建自己的 trading review workflow

不适合：

- 实盘下单
- 多账户权限管理
- 云端协作
- 高频或低延迟交易基础设施

## 后续可以继续做的方向

- 增加真正的全量导出 / 导入
- 增加多品种行情适配
- 增加标签体系、setup 统计和违规分析
- 增加更明确的数据库 migration 机制
- 增加端到端 smoke test
