import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Permission, Role, Settings } from '../../../shared/domain';
import { get, post, setCsrf } from './api';

export interface Me { id: string; email: string; display_name: string; role: Role }
export interface PublicConfig {
  turnstileSiteKey: string | null; paymentProvider: 'stripe' | 'sandbox'; environment: string;
  flags: Settings['flags']; escrow: Settings['escrow']; commission: Settings['commission']; withdrawal: { min_cents: number };
  payments: { usd_to_dzd: number; manual_payment_hours: number; methods: Array<'card' | 'edahabia' | 'cib' | 'baridimob'> };
}

interface Ctx {
  user: Me | null; permissions: Permission[]; config: PublicConfig | null; ready: boolean; unread: number;
  refresh: () => Promise<void>; setSession: (d: { user: Me; csrf: string; permissions: Permission[] }) => void; logout: () => Promise<void>;
  can: (p: Permission) => boolean;
}

const SessionCtx = createContext<Ctx>(null as unknown as Ctx);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [permissions, setPerms] = useState<Permission[]>([]);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const me = await get<{ user: Me | null; csrf: string | null; permissions: Permission[]; unreadNotifications?: number }>('/auth/me');
      setUser(me.user);
      setPerms(me.permissions ?? []);
      setCsrf(me.csrf);
      setUnread(me.unreadNotifications ?? 0);
    } catch {
      /* offline: keep previous state */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    get<PublicConfig>('/config').then(setConfig).catch(() => {});
    // Keep unread counters fresh while the tab is visible.
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 45_000);
    return () => clearInterval(t);
  }, [refresh]);

  const setSession = useCallback((d: { user: Me; csrf: string; permissions: Permission[] }) => {
    setUser(d.user);
    setPerms(d.permissions);
    setCsrf(d.csrf);
    setReady(true);
  }, []);

  const logout = useCallback(async () => {
    await post('/auth/logout').catch(() => {});
    setUser(null);
    setPerms([]);
    setCsrf(null);
  }, []);

  const can = useCallback((p: Permission) => permissions.includes(p), [permissions]);

  return <SessionCtx.Provider value={{ user, permissions, config, ready, unread, refresh, setSession, logout, can }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);
