import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Expo Router statically renders web routes in Node during `expo export`.
// AsyncStorage's web adapter touches window, so use an ephemeral server-side
// adapter while retaining persistent storage in the browser and native apps.
const authStorage = {
  getItem: (key: string) => typeof window === 'undefined' ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.removeItem(key),
};

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project'));

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { storage: authStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;
