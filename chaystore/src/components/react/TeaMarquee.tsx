import { useEffect, useState } from 'react';
import ScrollVelocity from '../../react-bits/ScrollVelocity';

const WORDS = ['Black', 'Green', 'Oolong', 'White', 'Matcha', 'Chai', 'Herbal', 'Rooibos'];

export default function TeaMarquee() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  if (still) return <p className="marquee-still">{WORDS.join(' · ')}</p>;
  return (
    <div className="marquee" aria-hidden="true">
      <ScrollVelocity
        texts={[WORDS.join('  ·  ') + '  ·  ', 'Steep  ·  Sip  ·  Repeat  ·  ']}
        velocity={40}
        numCopies={6}
        className="marquee-text"
      />
    </div>
  );
}
