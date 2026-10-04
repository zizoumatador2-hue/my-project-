// Cinematic hero background: React Bits "Aurora" (WebGL, ogl). Skipped for reduced-motion users;
// the CSS gradient layers behind it remain as the static fallback.
import { useEffect, useState } from 'react';
import Aurora from '../../react-bits/Aurora';

export default function AuroraBg() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(!matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  if (!on) return null;
  return (
    <div className="hero-aurora" aria-hidden="true">
      <Aurora colorStops={['#2f5d3a', '#e6b87a', '#c2703d']} amplitude={1.1} blend={0.6} speed={0.6} />
    </div>
  );
}
