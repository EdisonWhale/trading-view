import { Suspense, lazy, useState } from 'react';
import { TabNav } from './components/layout/TabNav';
import type { TabId } from './types';

const Overview  = lazy(() => import('./pages/Overview'));
const Journal   = lazy(() => import('./pages/Journal'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Review    = lazy(() => import('./pages/Review'));
const Settings  = lazy(() => import('./pages/Settings'));

const TAB_META: Record<TabId, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: 'Strategic Board',
    title: '账户总览',
    description: '把盈亏、回撤与纪律信号压缩成一张更专业的复盘总台。',
  },
  journal: {
    eyebrow: 'Trading Log',
    title: '交易日志',
    description: '按交易日归档成交、配对交易与盘中记录，保持原始证据完整。',
  },
  analytics: {
    eyebrow: 'Pattern Lab',
    title: '图表分析',
    description: '从权益曲线、分布、回撤和时段行为里提取稳定优势与失真区域。',
  },
  review: {
    eyebrow: 'Review Desk',
    title: '复盘工作台',
    description: '把当日情绪、执行质量和规则偏差放到同一套复盘框架里。',
  },
  settings: {
    eyebrow: 'Control Panel',
    title: '系统设置',
    description: '管理数据资产、导出记录，并保持整个复盘系统可回溯。',
  },
};

function PageLoader() {
  return <div className="page-loader">加载中...</div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const meta = TAB_META[activeTab];

  return (
    <div className="app-shell">
      <div className="shell-ornament shell-ornament--left" aria-hidden="true" />
      <div className="shell-ornament shell-ornament--right" aria-hidden="true" />
      <aside className="shell-sidebar">
        <TabNav active={activeTab} onChange={setActiveTab} />
      </aside>
      <main className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar__meta">
            <p className="shell-topbar__eyebrow">{meta.eyebrow}</p>
            <div className="shell-topbar__title">{meta.title}</div>
            <p>{meta.description}</p>
          </div>
          <div className="shell-status">
            <div className="shell-status__tile">
              <span>模式</span>
              <strong>Ink Review OS</strong>
            </div>
            <div className="shell-status__tile">
              <span>定位</span>
              <strong>Trading Playback</strong>
            </div>
            <div className="shell-status__stamp">RV</div>
          </div>
        </header>
        <section className="shell-stage">
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'overview'   && <Overview  />}
            {activeTab === 'journal'    && <Journal   />}
            {activeTab === 'analytics'  && <Analytics />}
            {activeTab === 'review'     && <Review    />}
            {activeTab === 'settings'   && <Settings  />}
          </Suspense>
        </section>
      </main>
    </div>
  );
}
