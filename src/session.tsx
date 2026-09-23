import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

const SessionContext = createContext<{ user: User | null; ready: boolean; clearSession: () => void }>({ user: null, ready: false, clearSession: () => undefined });
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return <SessionContext.Provider value={{ user, ready, clearSession: () => setUser(null) }}>{children}</SessionContext.Provider>;
}
export const useSession = () => useContext(SessionContext);
