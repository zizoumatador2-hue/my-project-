import SpotlightCard from '../../react-bits/SpotlightCard';

interface Ritual {
  title: string;
  kicker: string;
  description: string;
  image: string;
  image2x: string;
  alt: string;
  href: string;
}

export default function RitualAtlas({ items }: { items: Ritual[] }) {
  return (
    <ul className="ritual-grid">
      {items.map((item, index) => (
        <li className={`ritual-item ritual-item-${index + 1}`} key={item.href}>
          <SpotlightCard className="ritual-card" spotlightColor="rgba(230, 184, 122, 0.24)">
            <a href={item.href} aria-label={`Read: ${item.title}`}>
              <img
                src={item.image}
                srcSet={`${item.image} 800w, ${item.image2x} 1600w`}
                sizes="(max-width: 720px) 100vw, (max-width: 1000px) 50vw, 34vw"
                alt={item.alt}
                width={800}
                height={1000}
                loading="lazy"
                decoding="async"
              />
              <span className="ritual-shade" aria-hidden="true" />
              <span className="ritual-copy">
                <span className="ritual-kicker">{item.kicker}</span>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </span>
            </a>
          </SpotlightCard>
        </li>
      ))}
    </ul>
  );
}

