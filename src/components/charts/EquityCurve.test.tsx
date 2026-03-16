import { Area, Line } from 'recharts';
import { EquityCurve } from './EquityCurve';

function collectElements(node: any, found: any[] = []): any[] {
  if (!node || typeof node !== 'object') return found;
  if ('type' in node) found.push(node);

  const children = node.props?.children;
  if (Array.isArray(children)) {
    children.forEach((child) => collectElements(child, found));
  } else if (children) {
    collectElements(children, found);
  }

  return found;
}

describe('EquityCurve', () => {
  it('renders separate profit and loss strokes instead of a single gradient stroke', () => {
    const tree = EquityCurve({
      data: [
        { date: '2026-03-09', balance: 5000, netPnl: 0 },
        { date: '2026-03-10', balance: 5003.04, netPnl: 3.04 },
        { date: '2026-03-11', balance: 5230.95, netPnl: 227.91 },
        { date: '2026-03-12', balance: 5212.64, netPnl: -18.31 },
        { date: '2026-03-13', balance: 4765.58, netPnl: -447.06 },
      ],
      mode: 'amount',
      variant: 'paper',
    });

    const elements = collectElements(tree);
    const areas = elements.filter((element) => element.type === Area);
    const lines = elements.filter((element) => element.type === Line);

    expect(areas.some((area) => area.props.stroke === 'url(#equityLineGrad)')).toBe(false);
    expect(lines.map((line) => line.props.stroke)).toEqual(
      expect.arrayContaining(['#1f9d6c', '#d66161'])
    );
  });
});
