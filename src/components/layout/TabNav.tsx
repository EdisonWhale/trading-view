import type { TabId } from '../../types';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; code: string; note: string }[] = [
  { id: 'overview',  label: '概览', code: '01', note: '总览看板' },
  { id: 'journal',   label: '交易日志', code: '02', note: '原始记录' },
  { id: 'analytics', label: '图表分析', code: '03', note: '结构洞察' },
  { id: 'review',    label: '复盘', code: '04', note: '日内复盘' },
  { id: 'settings',  label: '设置', code: '05', note: '系统控制' },
];

export function TabNav({ active, onChange }: Props) {
  return (
    <nav className="tab-nav">
      <div className="tab-nav__brand">
        <div className="tab-nav__seal">TR</div>
        <div>
          <span className="tab-nav__eyebrow">Trading Review</span>
          <span className="tab-nav__title">交易复盘终端</span>
        </div>
      </div>
      <div className="tab-nav__intro">
        用更克制的界面读清楚账户、执行与规则，而不是被卡片噪音淹没。
      </div>
      <ul className="tab-nav__list">
        {TABS.map((tab) => (
          <li key={tab.id}>
            <button
              type="button"
              className={`tab-nav__item ${active === tab.id ? 'tab-nav__item--active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <span className="tab-nav__code">{tab.code}</span>
              <span className="tab-nav__copy">
                <strong>{tab.label}</strong>
                <small>{tab.note}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-nav__footer">
        <span>Rice Paper UI</span>
        <strong>审美上收敛，判断上更锋利</strong>
      </div>
    </nav>
  );
}
