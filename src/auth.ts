import { supabase } from './supabase';
import * as Linking from 'expo-linking';
const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

export async function signUpWithPassword(email: string, password: string, fullName?: string) {
  const { data, error } = await requireClient().auth.signUp({
    email: email.trim().toLowerCase(), password,
    options: { data: fullName?.trim() ? { full_name: fullName.trim() } : undefined },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await requireClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await requireClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: Linking.createURL('auth/callback', { queryParams: { mode: 'reset' } }),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { data, error } = await requireClient().auth.updateUser({ password });
  if (error) throw error;
  return data;
}

/** Kept for the legacy non-router shell; the active Account screen uses passwords. */
export async function sendSignInLink(email: string) {
  const { error } = await requireClient().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: Linking.createURL('auth/callback') } });
  if (error) throw error;
}
