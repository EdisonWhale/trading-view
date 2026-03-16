import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { JournalEntry } from '../../types';

interface Props {
  sessionDate: string;
  initial: JournalEntry | null;
  onSave?: (j: JournalEntry) => void;
}

const REGIMES = ['趋势', '震荡', '混合'] as const;
const COMMON_RULE_BREAKS = ['逆势交易', '超出止损', '仓位过大', '情绪交易', '延迟出场', '提前离场', '无计划入场'];

export function JournalForm({ sessionDate, initial, onSave }: Props) {
  const [form, setForm] = useState<Omit<JournalEntry, 'updatedAt'>>({
    sessionDate,
    emotionScore: initial?.emotionScore ?? 7,
    energyScore: initial?.energyScore ?? 7,
    executionScore: initial?.executionScore ?? 7,
    marketRegime: initial?.marketRegime ?? '',
    premarketNotes: initial?.premarketNotes ?? '',
    reviewSummary: initial?.reviewSummary ?? '',
    whatWorked: initial?.whatWorked ?? [],
    whatFailed: initial?.whatFailed ?? [],
    nextFocus: initial?.nextFocus ?? '',
    ruleBreaks: initial?.ruleBreaks ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      sessionDate,
      emotionScore: initial?.emotionScore ?? 7,
      energyScore: initial?.energyScore ?? 7,
      executionScore: initial?.executionScore ?? 7,
      marketRegime: initial?.marketRegime ?? '',
      premarketNotes: initial?.premarketNotes ?? '',
      reviewSummary: initial?.reviewSummary ?? '',
      whatWorked: initial?.whatWorked ?? [],
      whatFailed: initial?.whatFailed ?? [],
      nextFocus: initial?.nextFocus ?? '',
      ruleBreaks: initial?.ruleBreaks ?? [],
    });
  }, [sessionDate, initial]);

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.updateJournal(sessionDate, form);
      onSave?.(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const toggleRuleBreak = (item: string) => {
    set('ruleBreaks', form.ruleBreaks.includes(item)
      ? form.ruleBreaks.filter((r) => r !== item)
      : [...form.ruleBreaks, item]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Scores */}
      <div className="grid-3" style={{ gap: 16 }}>
        {[
          { key: 'emotionScore', label: '情绪' },
          { key: 'energyScore', label: '能量' },
          { key: 'executionScore', label: '执行' },
        ].map(({ key, label }) => (
          <div key={key} className="form-group">
            <label className="form-label">{label} 评分</label>
            <div className="score-slider">
              <input
                type="range" min={1} max={10}
                value={(form as unknown as Record<string, number>)[key]}
                onChange={(e) => set(key, parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span className="score-slider__value">{(form as unknown as Record<string, number>)[key]}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Market Regime */}
      <div className="form-group">
        <label className="form-label">市场环境</label>
        <div className="tag-group">
          {REGIMES.map((r) => (
            <button key={r} type="button" className={`tag ${form.marketRegime === r ? 'tag--active' : ''}`} onClick={() => set('marketRegime', form.marketRegime === r ? '' : r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Premarket Notes */}
      <div className="form-group">
        <label className="form-label">盘前计划</label>
        <textarea className="form-textarea" value={form.premarketNotes} onChange={(e) => set('premarketNotes', e.target.value)} placeholder="今日关注点、关键价位、计划..." rows={3} />
      </div>

      {/* Review Summary */}
      <div className="form-group">
        <label className="form-label">复盘总结</label>
        <textarea className="form-textarea" value={form.reviewSummary} onChange={(e) => set('reviewSummary', e.target.value)} placeholder="今日整体表现..." rows={4} />
      </div>

      {/* What worked / failed (simple textareas, newline separated) */}
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="form-group">
          <label className="form-label">做对了</label>
          <textarea className="form-textarea" value={form.whatWorked.join('\n')} onChange={(e) => set('whatWorked', e.target.value.split('\n').filter(Boolean))} placeholder="每行一条..." rows={3} />
        </div>
        <div className="form-group">
          <label className="form-label">待改进</label>
          <textarea className="form-textarea" value={form.whatFailed.join('\n')} onChange={(e) => set('whatFailed', e.target.value.split('\n').filter(Boolean))} placeholder="每行一条..." rows={3} />
        </div>
      </div>

      {/* Next Focus */}
      <div className="form-group">
        <label className="form-label">明日重点</label>
        <input className="form-input" value={form.nextFocus} onChange={(e) => set('nextFocus', e.target.value)} placeholder="明日最需要注意的一件事..." />
      </div>

      {/* Rule Breaks */}
      <div className="form-group">
        <label className="form-label">违规记录</label>
        <div className="tag-group">
          {COMMON_RULE_BREAKS.map((item) => (
            <button key={item} type="button" className={`tag ${form.ruleBreaks.includes(item) ? 'tag--active' : ''}`}
              style={form.ruleBreaks.includes(item) ? { background: 'var(--loss-dim)', borderColor: 'var(--loss-border)', color: 'var(--loss)' } : {}}
              onClick={() => toggleRuleBreak(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn--primary" onClick={handleSave} disabled={saving} style={{ minWidth: 100 }}>
          {saving ? '保存中...' : saved ? '已保存 ✓' : '保存日志'}
        </button>
      </div>
    </div>
  );
}
