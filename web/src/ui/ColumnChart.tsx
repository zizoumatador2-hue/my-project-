import { useMemo, useState } from 'react';
import { money } from '../lib/format';

/**
 * Single-series column chart (one measure per chart — never a dual axis).
 * RTL: time runs in reading direction, so the earliest day sits on the right edge.
 * Specs: columns ≤ 24px with a 4px rounded data-end and square baseline, hairline recessive grid,
 * clean y ticks, one direct label (the maximum), hover tooltip, and a table view.
 */
export function ColumnChart({ data, label }: { data: Array<{ day: string; value: number }>; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = 220, padTop = 24, padBottom = 28, padSide = 56;
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = useMemo(() => {
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
    return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
  }, [max]);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = W - padSide - 8;
  const slot = plotW / Math.max(1, data.length);
  const bw = Math.min(24, slot * 0.6);
  const y = (v: number) => padTop + (H - padTop - padBottom) * (1 - v / top);
  // RTL: index 0 (earliest) at the right.
  const xCenter = (i: number) => 8 + plotW - slot * (i + 0.5);
  const maxIdx = data.findIndex((d) => d.value === max);
  if (!data.length) return <p className="small muted">لا بيانات في هذه الفترة.</p>;

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: 'relative' }}>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={8} x2={8 + plotW} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={W - 4} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(t * 100)}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const h = Math.max(0, y(0) - y(d.value));
            const x = xCenter(i) - bw / 2;
            const r = Math.min(4, h / 2, bw / 2);
            return (
              <g key={d.day} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${d.day}: ${money(d.value * 100)}`}>
                <rect x={xCenter(i) - slot / 2} y={padTop} width={slot} height={H - padTop - padBottom} fill="transparent" />
                {h > 0 && <path d={`M${x},${y(0)} V${y(d.value) + r} Q${x},${y(d.value)} ${x + r},${y(d.value)} H${x + bw - r} Q${x + bw},${y(d.value)} ${x + bw},${y(d.value) + r} V${y(0)} Z`} fill="var(--vault)" opacity={hover === null || hover === i ? 1 : 0.55} />}
                {i === maxIdx && d.value > 0 && <text x={xCenter(i)} y={y(d.value) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text)">{money(d.value * 100)}</text>}
                {(i === 0 || i === data.length - 1) && <text x={xCenter(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{d.day.slice(5)}</text>}
              </g>
            );
          })}
          <line x1={8} x2={8 + plotW} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" strokeWidth={1} />
        </svg>
        {hover !== null && (
          <div className="card" role="status" style={{ position: 'absolute', insetBlockStart: 0, insetInlineStart: 8, padding: '6px 10px', fontSize: '0.8rem', pointerEvents: 'none', boxShadow: 'var(--shadow-lg)' }}>
            <div className="muted">{data[hover].day}</div><strong className="num">{money(data[hover].value * 100, true)}</strong>
          </div>
        )}
      </div>
      <details className="small" style={{ marginBlockStart: 6 }}>
        <summary style={{ cursor: 'pointer' }} className="muted">عرض كجدول</summary>
        <table className="table" style={{ marginBlockStart: 6 }}><thead><tr><th>اليوم</th><th className="num">{label}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.day}><td>{d.day}</td><td className="num">{money(d.value * 100, true)}</td></tr>)}</tbody></table>
      </details>
    </figure>
  );
}
