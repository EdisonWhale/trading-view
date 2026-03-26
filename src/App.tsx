import { FormEvent, Suspense, lazy, useEffect, useState } from 'react';
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

type AuthState = 'checking' | 'authenticated' | 'unauthenticated';

type LoginScreenProps = {
  authState: AuthState;
  errorMessage: string;
  isSubmitting: boolean;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LoginScreen({
  authState,
  errorMessage,
  isSubmitting,
  password,
  onPasswordChange,
  onSubmit,
}: LoginScreenProps) {
  return (
    <main className="login-shell">
      <div className="login-orb login-orb--left" aria-hidden="true" />
      <div className="login-orb login-orb--right" aria-hidden="true" />
      <section className="login-panel">
        <p className="login-panel__eyebrow">Review Access</p>
        <h1 className="login-panel__title">Trading Review Dashboard</h1>
        <p className="login-panel__text">
          输入访问密码后，立即进入复盘工作台。
        </p>
        <form className="login-form" onSubmit={onSubmit}>
          <label className="login-form__label" htmlFor="review-password">
            访问密码
          </label>
          <input
            id="review-password"
            className="login-form__input"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            autoFocus
            disabled={authState === 'checking' || isSubmitting}
          />
          {errorMessage ? <p className="login-form__error">{errorMessage}</p> : null}
          <button
            className="login-form__submit"
            type="submit"
            disabled={authState === 'checking' || isSubmitting}
          >
            {authState === 'checking' ? '验证中...' : isSubmitting ? '进入中...' : '进入工作台'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [tradingDays, setTradingDays] = useState<number | null>(null);
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const meta = TAB_META[activeTab];
  const reportDate = formatReportDate(new Date());

  useEffect(() => {
    let cancelled = false;

    api.getAuthSession()
      .then(({ authenticated }) => {
        if (cancelled) {
          return;
        }

        setAuthState(authenticated ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAuthState('unauthenticated');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (authState !== 'authenticated') {
      setTradingDays(null);
      return;
    }

    let cancelled = false;

    api.getSessions()
      .then((sessionList) => {
        if (!cancelled) {
          setTradingDays(sessionList.length);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTradingDays(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authState]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setErrorMessage('请输入密码。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await api.login(password);
      if (!result.authenticated) {
        setErrorMessage('密码错误。');
        return;
      }

      setPassword('');
      setAuthState('authenticated');
      setActiveTab('overview');
    } catch {
      setErrorMessage('密码错误。');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // Ignore logout failures and fall back to local state reset.
    }

    setPassword('');
    setErrorMessage('');
    setTradingDays(null);
    setActiveTab('overview');
    setAuthState('unauthenticated');
  }

  if (authState !== 'authenticated') {
    return (
      <LoginScreen
        authState={authState}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

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
            <button className="shell-status__action" type="button" onClick={handleLogout}>
              退出
            </button>
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
