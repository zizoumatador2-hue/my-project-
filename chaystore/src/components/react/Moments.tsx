import TiltedCard from '../../react-bits/TiltedCard';

interface Moment { slug: string; alt: string }

export default function Moments({ items }: { items: Moment[] }) {
  return (
    <ul className="moments">
      {items.map((m) => (
        <li key={m.slug}>
          <TiltedCard
            imageSrc={`/images/${m.slug}-800.webp`}
            altText={m.alt}
            captionText={m.alt}
            containerHeight="100%"
            containerWidth="100%"
            imageHeight="100%"
            imageWidth="100%"
            scaleOnHover={1.04}
            rotateAmplitude={8}
            showMobileWarning={false}
            showTooltip={false}
          />
        </li>
      ))}
    </ul>
  );
}
