import CountUp from '../../react-bits/CountUp';

interface Stat { value: number; label: string; suffix?: string }

export default function Stats({ stats }: { stats: Stat[] }) {
  return (
    <ul className="stats">
      {stats.map((s) => (
        <li key={s.label} aria-label={`${s.value.toLocaleString('en-US')}${s.suffix ?? ''} ${s.label}`}>
          <strong aria-hidden="true">
            <CountUp to={s.value} duration={2.2} separator="," />
            {s.suffix}
          </strong>
          <span aria-hidden="true">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}
