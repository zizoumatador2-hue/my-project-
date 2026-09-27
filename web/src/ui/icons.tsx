import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20): SVGProps<SVGSVGElement> => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true });

export const Icon = {
  Shield: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3 20 6v6c0 5-3.4 8.4-8 9.6C7.4 20.4 4 17 4 12V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>,
  Lock: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="4.5" y="10" width="15" height="10.5" rx="2.5" /><path d="M8 10V7.5a4 4 0 0 1 8 0V10" /><path d="M12 14v3" /></svg>,
  Search: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>,
  Home: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 11 12 4l8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5z" /></svg>,
  Deal: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M3 12h4l3-3 4 4 3-3h4" /><path d="M7 12v6h10v-6" /><path d="M10 9 8 7" /></svg>,
  Chat: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-4.6A7.5 7.5 0 1 1 20 12z" /></svg>,
  Wallet: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16" height="11" rx="2.5" /><path d="M16 13.5h.01" strokeWidth={3} /></svg>,
  User: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.3-3.6 4.1-5.3 7.5-5.3s6.2 1.7 7.5 5.3" /></svg>,
  Bell: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>,
  Plus: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  Check: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
  X: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  Alert: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 4 21 19.5H3z" /><path d="M12 10v4.5M12 17.2h.01" /></svg>,
  Info: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.8h.01" /></svg>,
  Eye: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  Upload: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" /></svg>,
  File: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5z" /><path d="M14 3.5V8h4" /></svg>,
  Scale: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 4v16M7 20h10M5 7h14" /><path d="m5 7-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" /></svg>,
  Flag: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 21V4.5M5 5h11l-2 4 2 4H5" /></svg>,
  Settings: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.4V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>,
  Chart: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></svg>,
  List: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.2} /></svg>,
  Users: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="9" cy="8.5" r="3.3" /><path d="M3 19.5c.9-3 3.2-4.5 6-4.5s5.1 1.5 6 4.5" /><path d="M15.5 5.5a3.2 3.2 0 0 1 0 6.2M17.5 15.2c1.7.6 2.9 2 3.5 4.3" /></svg>,
  Key: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2.5 2.5M14 9l2 2" /></svg>,
  Mail: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></svg>,
  Phone: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></svg>,
  Clock: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  ChevronForward: ({ size, ...p }: P) => <svg {...base(size)} className="icon-dir" {...p}><path d="m9 6 6 6-6 6" /></svg>,
  ChevronBack: ({ size, ...p }: P) => <svg {...base(size)} className="icon-dir" {...p}><path d="m15 6-6 6 6 6" /></svg>,
  ArrowForward: ({ size, ...p }: P) => <svg {...base(size)} className="icon-dir" {...p}><path d="M5 12h14m0 0-5-5m5 5-5 5" /></svg>,
  Send: ({ size, ...p }: P) => <svg {...base(size)} className="icon-dir" {...p}><path d="M4 12 20 4l-5 16-3-7z" /><path d="m12 13 8-9" /></svg>,
  Logout: ({ size, ...p }: P) => <svg {...base(size)} className="icon-dir" {...p}><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h10" /></svg>,
  Filter: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 5h16l-6.5 8v5.5l-3 1.5V13z" /></svg>,
  Refresh: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 13a8 8 0 0 0 14.3 4.3L20 15.5" /><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5" /></svg>,
  Gavel: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="m14 5 5 5M11.5 7.5l5 5M9 10l5 5M3 21l7.5-7.5" /><path d="M13 3.5 20.5 11" /></svg>,
  Menu: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

const PLATFORM_STYLE: Record<string, { bg: string; glyph: ReactNode }> = {
  instagram: { bg: 'linear-gradient(135deg,#6a3fd1,#d62f7a 55%,#f0a34b)', glyph: <><rect x="5" y="5" width="14" height="14" rx="4" /><circle cx="12" cy="12" r="3.2" /><path d="M16 8h.01" strokeWidth={2.6} /></> },
  tiktok: { bg: '#111418', glyph: <path d="M13.5 4v10.2a3.2 3.2 0 1 1-3.2-3.2M13.5 4c.4 2.3 1.9 3.8 4.5 4" /> },
  snapchat: { bg: '#e8c400', glyph: <path d="M12 4.5c2.7 0 4.3 2 4.3 4.4v2.3l1.7.3-1.6 1.3c.5 1.4 1.6 2.4 3 2.8-.9.8-2.2.7-2.8 1.4-.5.6-.8 1.5-1.8 1.2-1.1-.3-1.8.8-2.8.8s-1.7-1.1-2.8-.8c-1 .3-1.3-.6-1.8-1.2-.6-.7-1.9-.6-2.8-1.4 1.4-.4 2.5-1.4 3-2.8L4 11.5l1.7-.3V8.9c0-2.4 1.6-4.4 4.3-4.4z" /> },
  x: { bg: '#0f1419', glyph: <path d="m5 5 14 14M19 5 5 19" /> },
  facebook: { bg: '#1f5fcf', glyph: <path d="M14.5 20v-7h2.3l.4-2.8h-2.7V8.6c0-.8.3-1.4 1.4-1.4h1.4V4.7c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5v2.1H9.6V13h2.3v7" /> },
  youtube: { bg: '#d8261c', glyph: <><rect x="3.5" y="6" width="17" height="12" rx="3.5" /><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" /></> },
};

export function PlatformBadge({ platform, small }: { platform: string; small?: boolean }) {
  const s = PLATFORM_STYLE[platform] ?? PLATFORM_STYLE.x;
  const size = small ? 16 : 22;
  return (
    <span className={`platform-badge${small ? ' sm' : ''}`} style={{ background: s.bg, color: platform === 'snapchat' ? '#111' : '#fff' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{s.glyph}</svg>
    </span>
  );
}

export function BrandMark() {
  return (
    <svg className="mark" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#0D1B2A" />
      <path d="M32 11 50 18v13c0 11-7.6 19.4-18 22-10.4-2.6-18-11-18-22V18z" fill="none" stroke="#C9A25A" strokeWidth="4" strokeLinejoin="round" />
      <path d="m24 32 6 6 11-12" fill="none" stroke="#F5F3EE" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
