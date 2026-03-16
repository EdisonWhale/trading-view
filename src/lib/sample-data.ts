import type { Execution, MarketBar, SessionLevel, TradingDay } from './types';

const SESSION_START_HOUR = 9;
const SESSION_START_MINUTE = 30;

function toTimestamp(sessionDate: string, offsetMinutes: number): number {
  const sessionStart = new Date(`${sessionDate}T${String(SESSION_START_HOUR).padStart(2, '0')}:${String(SESSION_START_MINUTE).padStart(2, '0')}:00-04:00`);
  return Math.floor((sessionStart.getTime() + offsetMinutes * 60_000) / 1000);
}

function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

function createSessionBars(
  sessionDate: string,
  startPrice: number,
  segments: Array<{ length: number; drift: number; amplitude: number }>,
): MarketBar[] {
  const bars: MarketBar[] = [];
  let current = startPrice;
  let cursor = 0;

  for (const segment of segments) {
    for (let step = 0; step < segment.length; step += 1) {
      const rhythm = Math.sin((cursor + 1) * 0.72) * segment.amplitude;
      const impulse = Math.cos((cursor + 1) * 0.17) * (segment.amplitude * 0.4);
      const next = roundToQuarter(current + segment.drift + rhythm + impulse);
      const high = roundToQuarter(Math.max(current, next) + 1 + Math.abs(Math.cos(cursor * 0.41)) * 0.75);
      const low = roundToQuarter(Math.min(current, next) - 1 - Math.abs(Math.sin(cursor * 0.38)) * 0.75);

      bars.push({
        time: toTimestamp(sessionDate, cursor),
        open: roundToQuarter(current),
        high,
        low,
        close: next,
        volume: Math.round(130 + Math.abs(next - current) * 190 + (segment.length - step) * 1.5),
      });

      current = next;
      cursor += 1;
    }
  }

  return bars;
}

function createExecution(
  bars: MarketBar[],
  index: number,
  details: Omit<Execution, 'id' | 'timestamp' | 'timeLabel' | 'price'> & { price?: number },
): Execution {
  const bar = bars[Math.min(index, bars.length - 1)];
  const date = new Date(bar.time * 1000);
  const timeLabel = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    id: `${details.side}-${bar.time}-${details.tag}`,
    timestamp: bar.time,
    timeLabel,
    price: details.price ?? bar.close,
    ...details,
  };
}

function levels(...items: SessionLevel[]): SessionLevel[] {
  return items;
}

const march09Bars = createSessionBars('2026-03-09', 6698, [
  { length: 30, drift: 0.12, amplitude: 0.4 },
  { length: 30, drift: -0.06, amplitude: 0.35 },
  { length: 30, drift: 0.05, amplitude: 0.3 },
]);

const march10Bars = createSessionBars('2026-03-10', 6708, [
  { length: 35, drift: -0.18, amplitude: 0.7 },
  { length: 30, drift: 0.22, amplitude: 0.65 },
  { length: 35, drift: -0.1, amplitude: 0.55 },
]);

const march11Bars = createSessionBars('2026-03-11', 6674, [
  { length: 28, drift: 0.48, amplitude: 0.75 },
  { length: 34, drift: 0.18, amplitude: 0.6 },
  { length: 28, drift: -0.04, amplitude: 0.45 },
]);

const march12Bars = createSessionBars('2026-03-12', 6710, [
  { length: 32, drift: 0.1, amplitude: 0.6 },
  { length: 30, drift: -0.14, amplitude: 0.58 },
  { length: 28, drift: 0.08, amplitude: 0.52 },
]);

const march13Bars = createSessionBars('2026-03-13', 6717, [
  { length: 25, drift: -0.38, amplitude: 0.65 },
  { length: 35, drift: -0.56, amplitude: 0.9 },
  { length: 30, drift: -0.22, amplitude: 0.6 },
]);

export const seedTradingDays: TradingDay[] = [
  {
    sessionDate: '2026-03-09',
    startBalance: 0,
    deposits: 3000,
    endBalance: 3000,
    realizedPnl: 0,
    marketRegime: 'offline',
    ruleBreaks: [],
    setups: [],
    contract: 'MESM6',
    headline: '入金日。无需强行交易，建立干净的账户基线，整理盘前关键价位。',
    emotionScore: 6,
    planChecklist: [
      { label: '只标记A+级别机会', done: true },
      { label: '固定持仓1手微合约', done: true },
      { label: '入金后避免报复性交易', done: true },
    ],
    review: {
      summary: '当日无交易，默认成为本周执行合规最高的一天。',
      whatWorked: ['计划重置期间保持空仓，避免情绪化操作。'],
      whatFailed: ['未保存带标注的盘后截图。'],
      nextFocus: '将被动准备转化为每日可执行的盘前清单。',
    },
    executions: [],
    levels: levels(
      { label: '开盘区间', price: 6698, tone: 'support' },
      { label: '接受区高点', price: 6706, tone: 'resistance' },
    ),
    bars: march09Bars,
  },
  {
    sessionDate: '2026-03-10',
    startBalance: 3000,
    deposits: 0,
    endBalance: 3003,
    realizedPnl: 12.5,
    marketRegime: 'rotation',
    ruleBreaks: [],
    setups: [
      {
        name: '逆势短打',
        trades: 1,
        wins: 1,
        pnl: 12.5,
      },
    ],
    contract: 'MESM6',
    headline: '小幅盈利日。震荡走势判断准确，但利润偏薄，不应该有多次交易机会。',
    emotionScore: 6,
    planChecklist: [
      { label: '等待VWAP收复后再做淡仓', done: true },
      { label: '在首个阻力区获利了结', done: true },
      { label: '避免因无聊产生的第二次交易', done: true },
    ],
    review: {
      summary: '克制良好，但对机会的判断仍依赖感觉而非明确的策略手册。',
      whatWorked: ['抓住了首次反应位，没有过度持有。', '无过度交易。'],
      whatFailed: ['本笔交易未附截图或策略评级记录。'],
      nextFocus: '开始用市场类型和策略系列对每笔交易进行标签化管理。',
    },
    executions: [
      createExecution(march10Bars, 21, { side: 'buy', qty: 1, tag: 'entry', note: 'VWAP收复跟进做多' }),
      createExecution(march10Bars, 28, { side: 'sell', qty: 1, tag: 'exit', note: '首次阻力位触及出场', pnl: 12.5 }),
    ],
    levels: levels(
      { label: 'VWAP收复', price: 6702.5, tone: 'support' },
      { label: '早盘高点', price: 6711.25, tone: 'resistance' },
    ),
    bars: march10Bars,
  },
  {
    sessionDate: '2026-03-11',
    startBalance: 3003,
    deposits: 0,
    endBalance: 3231,
    realizedPnl: 245,
    marketRegime: 'mixed',
    ruleBreaks: [],
    setups: [
      {
        name: '顺势回踩',
        trades: 2,
        wins: 2,
        pnl: 245,
      },
    ],
    contract: 'MESM6',
    headline: '本周最佳交易日。顺势回踩入场，耐心持有，清晰出场，无防御性失误。',
    emotionScore: 8,
    planChecklist: [
      { label: '仅跟随15分钟级别方向交易', done: true },
      { label: '入场前挂好附条件委托', done: true },
      { label: '出场后记录截图', done: true },
    ],
    review: {
      summary: '这就是模板级交易日。方向判断、入场位置、触发信号与出场目标完全对齐，无情绪干扰。',
      whatWorked: [
        '等待价格回踩价值区，未追高入场。',
        '趁趋势延伸时获利，避免英雄式持仓。',
      ],
      whatFailed: ['第二笔交易仍依靠记忆而非明确的R倍数追踪。'],
      nextFocus: '将此类策略整理为带样本和失败条件的命名策略页。',
    },
    executions: [
      createExecution(march11Bars, 18, { side: 'buy', qty: 1, tag: 'entry', note: '首次VWAP回踩入场' }),
      createExecution(march11Bars, 34, { side: 'sell', qty: 1, tag: 'exit', note: '趋势延伸出场', pnl: 118.75 }),
      createExecution(march11Bars, 47, { side: 'buy', qty: 1, tag: 'entry', note: '上午后段高低点确认' }),
      createExecution(march11Bars, 61, { side: 'sell', qty: 1, tag: 'exit', note: '前高测试出场', pnl: 126.25 }),
    ],
    levels: levels(
      { label: 'VWAP回踩区', price: 6685.5, tone: 'support' },
      { label: '日内高点', price: 6718.25, tone: 'resistance' },
    ),
    bars: march11Bars,
  },
  {
    sessionDate: '2026-03-12',
    startBalance: 3231,
    deposits: 2000,
    endBalance: 5213,
    realizedPnl: -3.75,
    marketRegime: 'rotation',
    ruleBreaks: [],
    setups: [
      {
        name: 'VWAP淡仓',
        trades: 1,
        wins: 0,
        pnl: -3.75,
      },
    ],
    contract: 'MESM6',
    headline: '表面持平，但额外入金增加了情绪压力，耗尽了交易耐心。',
    emotionScore: 5,
    planChecklist: [
      { label: '不让新入金改变持仓规则', done: false },
      { label: '仅在拍卖失败后做淡仓', done: true },
      { label: '首次低能量失败交易后立即离场', done: true },
    ],
    review: {
      summary: '结果看似无害，但心理已产生偏移。新入金在次日前就提高了预期。',
      whatWorked: ['亏损控制在极小范围内。', '未在止损后加倍下注。'],
      whatFailed: ['余额增加引发了扩张性思维，而非聚焦复盘与修复。'],
      nextFocus: '将入金视为资本保护，而非加速节奏的许可。',
    },
    executions: [
      createExecution(march12Bars, 26, { side: 'sell', qty: 1, tag: 'entry', note: 'VWAP附近阻力位淡仓入场' }),
      createExecution(march12Bars, 37, { side: 'buy', qty: 1, tag: 'exit', note: '价格回归均值出场', pnl: -3.75 }),
    ],
    levels: levels(
      { label: '震荡区上沿', price: 6720.5, tone: 'resistance' },
      { label: 'VWAP口袋', price: 6711, tone: 'support' },
    ),
    bars: march12Bars,
  },
  {
    sessionDate: '2026-03-13',
    startBalance: 5213,
    deposits: 0,
    endBalance: 4766,
    realizedPnl: -447,
    marketRegime: 'trend',
    ruleBreaks: [
      '趋势下行日持续做逆势多单',
      '向亏损仓位加仓',
      '忽视原始止损逻辑',
    ],
    setups: [
      {
        name: '顺势回踩',
        trades: 1,
        wins: 1,
        pnl: 12.5,
      },
      {
        name: '逆势短打',
        trades: 4,
        wins: 1,
        pnl: -459.5,
      },
    ],
    contract: 'MESM6',
    headline: '破坏全周的一天。首次做空成功，随后急于追回亏损，将每次反弹都变成了陷阱。',
    emotionScore: 3,
    planChecklist: [
      { label: '仅跟随趋势日方向交易', done: false },
      { label: '硬止损固定不动', done: false },
      { label: '一个思路，最多一次重试', done: false },
    ],
    review: {
      summary: '第一次判断是正确的。损失发生在盈利之后——急迫感将目标从执行转移到了情绪宣泄。',
      whatWorked: ['初始做空符合日内结构，快速兑现盈利。'],
      whatFailed: [
        '将趋势日变成了多次逆势抄底尝试。',
        '将不适感转化为加仓而非降低风险。',
        '因害怕被止损而坚持持有亏损多单。',
      ],
      nextFocus: '复盘模式：连续30个交易日仅顺势交易，保持1手微合约，直到余额和行为均好转。',
    },
    executions: [
      createExecution(march13Bars, 6,  { side: 'sell', qty: 1, tag: 'entry', note: '开盘驱动做空',           price: 6715 }),
      createExecution(march13Bars, 17, { side: 'buy',  qty: 1, tag: 'exit',  note: '回补跟进低点',           price: 6702.5, pnl: 12.5 }),
      createExecution(march13Bars, 18, { side: 'buy',  qty: 1, tag: 'entry', note: '第一次逆势做多',         price: 6702.25 }),
      createExecution(march13Bars, 43, { side: 'sell', qty: 1, tag: 'exit',  note: '论文方向崩溃后延迟止损', price: 6663.5, pnl: -193.75 }),
      createExecution(march13Bars, 52, { side: 'buy',  qty: 1, tag: 'entry', note: '再次尝试捕捉反弹',       price: 6654.75 }),
      createExecution(march13Bars, 56, { side: 'buy',  qty: 1, tag: 'add',   note: '红仓加码',               price: 6650 }),
      createExecution(march13Bars, 62, { side: 'buy',  qty: 1, tag: 'add',   note: '第三次触及，继续均摊',   price: 6661.25 }),
      createExecution(march13Bars, 63, { side: 'sell', qty: 2, tag: 'trim',  note: '部分恐慌性减仓',         price: 6661, pnl: 21.25 }),
      createExecution(march13Bars, 71, { side: 'buy',  qty: 1, tag: 'entry', note: '再次尝试反转',           price: 6639.5 }),
      createExecution(march13Bars, 80, { side: 'sell', qty: 1, tag: 'exit',  note: '临时反弹出场',           price: 6652, pnl: 62.5 }),
      createExecution(march13Bars, 88, { side: 'sell', qty: 3, tag: 'exit',  note: '尾盘强制清仓',           price: 6634.5, pnl: -349.5 }),
    ],
    levels: levels(
      { label: '反弹失败位', price: 6702.25, tone: 'warning' },
      { label: '趋势延续确认', price: 6663.5, tone: 'support' },
      { label: '尾盘清仓位', price: 6634.5, tone: 'warning' },
    ),
    bars: march13Bars,
  },
];
