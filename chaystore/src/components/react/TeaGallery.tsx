// React Bits "CircularGallery" (WebGL). Decorative: the same photos are credited on /credits/.
// Uses the self-hosted Fraunces font (no external font request).
import CircularGallery from '../../react-bits/CircularGallery';

export default function TeaGallery({ items }: { items: { image: string; text: string }[] }) {
  return (
    <div className="gallery-wrap" aria-hidden="true">
      <CircularGallery items={items} bend={2.4} textColor="#f3e9d2" borderRadius={0.06} font="bold 30px Fraunces" scrollSpeed={2} scrollEase={0.06} />
    </div>
  );
}
