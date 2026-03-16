import { Suspense, lazy, useEffect, useState } from 'react';
import { api } from './api/client';
import { TabNav } from './components/layout/TabNav';
import type { TabId } from './types';

const Overview  = lazy(() => import('./pages/Overview'));
const Journal   = lazy(() => import('./pages/Journal'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Review    = lazy(() => import('./pages/Review'));
const Settings  = lazy(() => import('./pages/Settings'));

const TAB_META: Record<TabId, { eyebrow: string; title: string }> = {
  overview: {
    eyebrow: 'Overview',
    title: '概览',
  },
  journal: {
    eyebrow: 'Journal',
    title: '交易日志',
  },
  analytics: {
    eyebrow: 'Analytics',
    title: '图表分析',
  },
  review: {
    eyebrow: 'Review',
    title: '复盘工作台',
  },
  settings: {
    eyebrow: 'Settings',
    title: '系统设置',
  },
};

function PageLoader() {
  return <div className="page-loader">加载中...</div>;
}

function formatReportDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [tradingDays, setTradingDays] = useState<number | null>(null);
  const meta = TAB_META[activeTab];
  const reportDate = formatReportDate(new Date());

  useEffect(() => {
    api.getSessions()
      .then((sessionList) => setTradingDays(sessionList.length))
      .catch(() => setTradingDays(null));
  }, []);

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
            <h1 className="shell-topbar__title">{meta.title}</h1>
          </div>
          <div className="shell-status">
            <div className="shell-status__tile">
              <span>报告日期</span>
              <strong>{reportDate}</strong>
            </div>
            <div className="shell-status__tile">
              <span>交易天数</span>
              <strong>{tradingDays != null ? `${tradingDays} 天` : '—'}</strong>
            </div>
            <div className="shell-status__stamp" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="shell-status__icon">
                <path
                  d="M4 18.5h16M6 15l3.5-4 3 2.5 5-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.5 7.5H18v2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
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
