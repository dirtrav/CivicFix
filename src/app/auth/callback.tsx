import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../supabase';
import { colors } from '../../theme';

export default function AuthCallback() {
  const [message, setMessage] = useState('Completing sign in…');
  useEffect(() => { const finish = async () => { if (!supabase) { setMessage('Supabase is not configured.'); return; } try { const url = await Linking.getInitialURL(); const current = url ?? (typeof window !== 'undefined' ? window.location.href : ''); const parsed = new URL(current); const hash = new URLSearchParams(parsed.hash.replace(/^#/, '')); const access = hash.get('access_token') ?? parsed.searchParams.get('access_token'); const refresh = hash.get('refresh_token') ?? parsed.searchParams.get('refresh_token'); const tokenHash = parsed.searchParams.get('token_hash'); const recovery = parsed.searchParams.get('mode') === 'reset' || parsed.searchParams.get('type') === 'recovery' || hash.get('type') === 'recovery'; if (access && refresh) { const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh }); if (error) throw error; } else if (tokenHash) { const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: recovery ? 'recovery' : 'email' }); if (error) throw error; } else throw new Error('The sign-in link did not include a valid token.'); router.replace(recovery ? '/account?mode=reset' : '/account'); } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not complete sign in. Request a new link.'); } }; finish(); }, []);
  return <View style={s.page}><ActivityIndicator color={colors.accent} /><Text style={s.text}>{message}</Text></View>;
}
const s = StyleSheet.create({ page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, padding: 24, gap: 17 }, text: { color: colors.inkSoft, fontFamily: 'Inter_500Medium', fontSize: 14, textAlign: 'center' } });
