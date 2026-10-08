// Cinematic hero background: React Bits "Aurora" (WebGL, ogl).
// Performance: it starts only after the first user interaction, so WebGL never competes with
// first paint (LCP/TBT). Until then, and for reduced-motion users, the CSS gradient layers remain.
import { useEffect, useState } from 'react';
import Aurora from '../../react-bits/Aurora';

export default function AuroraBg() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const events = ['pointermove', 'scroll', 'touchstart', 'keydown'] as const;
    const start = () => {
      setOn(true);
      events.forEach((e) => removeEventListener(e, start));
    };
    events.forEach((e) => addEventListener(e, start, { once: true, passive: true }));
    return () => events.forEach((e) => removeEventListener(e, start));
  }, []);
  if (!on) return null;
  return (
    <div className="hero-aurora" aria-hidden="true">
      <Aurora colorStops={['#2f5d3a', '#e6b87a', '#c2703d']} amplitude={1.1} blend={0.6} speed={0.6} />
    </div>
  );
}
