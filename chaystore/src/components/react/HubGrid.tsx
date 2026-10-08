import SpotlightCard from '../../react-bits/SpotlightCard';

interface Hub { id: string; name: string; blurb: string; count: number; image?: string }

export default function HubGrid({ hubs }: { hubs: Hub[] }) {
  return (
    <ul className="grid hub-grid">
      {hubs.map((h) => (
        <li key={h.id}>
          <SpotlightCard className="hub-spot" spotlightColor="rgba(230, 184, 122, 0.28)">
            {h.image && <img className="hub-img" src={h.image} alt="" width={800} height={450} loading="lazy" decoding="async" />}
            <div className="hub-body">
              <h3><a href={`/category/${h.id}/`}>{h.name}</a></h3>
              <p>{h.blurb}</p>
              <span className="count">{h.count} guides</span>
            </div>
          </SpotlightCard>
        </li>
      ))}
    </ul>
  );
}
