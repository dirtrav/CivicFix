import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordReset, signInWithPassword, signUpWithPassword, updatePassword } from '../../auth';
import { useSession } from '../../session';
import { isSupabaseConfigured, supabase } from '../../supabase';
import { colors } from '../../theme';
import { ActionButton } from '../../ui';

type Mode = 'login' | 'signup';

export default function Account() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user, clearSession } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [staff, setStaff] = useState(false);
  const [resetMode, setResetMode] = useState(params.mode === 'reset');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    if (!user || !supabase) return;
    supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => setStaff(data?.role === 'staff' || data?.role === 'admin'));
  }, [user]);

  const switchMode = (next: Mode) => { setMode(next); setError(''); setNotice(''); setPassword(''); setConfirmPassword(''); };
  const requestReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) return setError('Enter the email address for your account.');
    if (!isSupabaseConfigured) return setError('Supabase is not configured.');
    setError(''); setNotice(''); setSending(true);
    try { await sendPasswordReset(normalizedEmail); setNotice('If an account exists for that email, we sent a password reset link.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send a reset link. Please try again.'); }
    finally { setSending(false); }
  };
  const saveNewPassword = async () => {
    if (!user) return setError('Open the password reset link from your email again.');
    if (newPassword.length < 8) return setError('Use a password with at least 8 characters.');
    if (newPassword !== confirmNewPassword) return setError('Passwords do not match.');
    setError(''); setNotice(''); setSending(true);
    try { await updatePassword(newPassword); setResetMode(false); setNewPassword(''); setConfirmNewPassword(''); setNotice('Password updated successfully.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update your password. Please try again.'); }
    finally { setSending(false); }
  };
  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use a password with at least 6 characters.');
    if (mode === 'signup' && password !== confirmPassword) return setError('Passwords do not match.');
    if (mode === 'signup' && fullName.trim().length < 2) return setError('Add your name so departments know who submitted the report.');
    if (!isSupabaseConfigured) return setError('Supabase is not configured.');
    setError(''); setNotice(''); setSending(true);
    try {
      if (mode === 'signup') {
        const data = await signUpWithPassword(normalizedEmail, password, fullName);
        setNotice(data.session ? 'Account created. You are signed in.' : 'Account created. Check your email to confirm your account before signing in.');
      } else { await signInWithPassword(normalizedEmail, password); setNotice('Signed in successfully.'); }
      setPassword(''); setConfirmPassword('');
    } catch (cause) { const message = cause instanceof Error ? cause.message : 'Authentication failed. Please try again.'; setError(message.replace('Invalid login credentials', 'Email or password is incorrect.')); }
    finally { setSending(false); }
  };
  const handleSignOut = async () => {
    if (!supabase) return setError('Supabase is not configured.');
    setError(''); setNotice(''); setSending(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) {
        clearSession();
        setError(`Signed out of this device, but Supabase returned an error: ${signOutError.message}`);
        return;
      }
      setStaff(false);
      setResetMode(false);
      clearSession();
      setNotice('Signed out successfully.');
    } catch (cause) {
      clearSession();
      setError(cause instanceof Error ? cause.message : 'Could not sign out. Please try again.');
    } finally {
      setSending(false);
    }
  };
  const signOut = () => {
    if (Platform.OS === 'web') {
      void handleSignOut();
      return;
    }
    Alert.alert('Sign out?', 'You can sign back in with your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { void handleSignOut(); } },
    ]);
  };

  return <SafeAreaView edges={['top']} style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.eyebrow}>CIVICFIX ACCOUNT</Text><Text style={s.title}>{user ? 'Your account' : mode === 'login' ? 'Welcome back' : 'Create your account'}</Text><Text style={s.lead}>{user ? 'Manage your session and see the reports you have sent.' : 'Use your email and password to submit and track civic reports.'}</Text>
    <View style={s.card}><View style={s.icon}><Ionicons name={user ? 'person-outline' : mode === 'login' ? 'log-in-outline' : 'person-add-outline'} size={27} color={colors.accent} /></View>
      {resetMode ? <><Text style={s.cardTitle}>Set a new password</Text><Text style={s.cardText}>Choose a new password for your CivicFix account.</Text><Text style={s.label}>New password</Text><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" placeholder="At least 8 characters" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="New password" /><Text style={s.label}>Confirm new password</Text><TextInput value={confirmNewPassword} onChangeText={setConfirmNewPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" placeholder="Repeat your new password" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Confirm new password" />{error ? <Text style={s.error}>{error}</Text> : null}{notice ? <Text style={s.notice}>{notice}</Text> : null}<View style={s.button}><ActionButton label={sending ? 'Updating password…' : 'Update password'} icon="checkmark" onPress={saveNewPassword} disabled={sending || !isSupabaseConfigured} /></View><Pressable onPress={() => { setResetMode(false); setError(''); setNotice(''); }} style={s.switch}><Text style={s.switchText}>Back to account</Text></Pressable></> : user ? <><Text style={s.cardTitle}>Signed in</Text><Text style={s.cardText}>{user.email}</Text><View style={s.button}><ActionButton label="View my reports" icon="document-text-outline" onPress={() => router.push('/activity')} /></View>{staff && <View style={s.button}><ActionButton label="Department workspace" icon="briefcase-outline" onPress={() => router.push('/staff')} secondary /></View>}<Pressable onPress={() => { setResetMode(true); setError(''); setNotice(''); }} style={s.switch}><Text style={s.switchText}>Change password</Text></Pressable><Pressable onPress={signOut} style={s.signOut}><Text style={s.signOutText}>Sign out</Text></Pressable></> : <>
        <View style={s.tabs}><Pressable onPress={() => switchMode('login')} style={[s.tab, mode === 'login' && s.tabActive]}><Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Log in</Text></Pressable><Pressable onPress={() => switchMode('signup')} style={[s.tab, mode === 'signup' && s.tabActive]}><Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>Sign up</Text></Pressable></View>
        <Text style={s.cardTitle}>{mode === 'login' ? 'Log in with email' : 'Create an account'}</Text><Text style={s.cardText}>{mode === 'login' ? 'Use the email and password you registered with.' : 'Create an account to send reports and follow their progress.'}</Text>
        {mode === 'signup' && <><Text style={s.label}>Your name</Text><TextInput value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Your name" /></>}
        <Text style={s.label}>Email address</Text><TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Email address" />
        <Text style={s.label}>Password</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'password'} textContentType={mode === 'signup' ? 'newPassword' : 'password'} placeholder="At least 6 characters" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Password" />
        {mode === 'signup' && <><Text style={s.label}>Confirm password</Text><TextInput value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" placeholder="Repeat your password" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Confirm password" /></>}
        {error ? <Text style={s.error}>{error}</Text> : null}{notice ? <Text style={s.notice}>{notice}</Text> : null}<View style={s.button}><ActionButton label={sending ? (mode === 'login' ? 'Logging in…' : 'Creating account…') : mode === 'login' ? 'Log in' : 'Create account'} icon="arrow-forward" onPress={submit} disabled={sending || !isSupabaseConfigured} /></View>{mode === 'login' && <Pressable onPress={requestReset} style={s.switch}><Text style={s.switchText}>Forgot password?</Text></Pressable>}{!isSupabaseConfigured && <Text style={s.error}>Supabase is not configured.</Text>}<Pressable onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={s.switch}><Text style={s.switchText}>{mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}</Text></Pressable>
      </>}</View><View style={s.info}><Ionicons name="shield-checkmark-outline" size={21} color={colors.accent} /><Text style={s.infoText}>Your email stays private. Public reports show issue details and location, never your account email.</Text></View>
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper }, content: { maxWidth: 550, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 40 }, eyebrow: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 }, title: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, marginTop: 6 }, lead: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 24 }, card: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule, borderRadius: 22, padding: 22 }, icon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, cardTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 21 }, cardText: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 21, marginTop: 8 }, tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.rule, marginBottom: 22 }, tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: colors.accent }, tabText: { color: colors.muted, fontFamily: 'Inter_600SemiBold', fontSize: 13 }, tabTextActive: { color: colors.accent }, label: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 20, marginBottom: 8 }, input: { height: 49, borderRadius: 13, borderWidth: 1, borderColor: colors.rule, paddingHorizontal: 14, color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 14 }, button: { marginTop: 16 }, error: { color: colors.danger, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, marginTop: 10 }, notice: { color: colors.success, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, marginTop: 10 }, switch: { alignSelf: 'center', paddingVertical: 15 }, switchText: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 13 }, signOut: { marginTop: 19, paddingVertical: 10, alignSelf: 'flex-start' }, signOutText: { color: colors.danger, fontFamily: 'Inter_600SemiBold', fontSize: 13 }, info: { marginTop: 20, padding: 16, flexDirection: 'row', gap: 12, backgroundColor: colors.accentSoft, borderRadius: 15 }, infoText: { flex: 1, color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 } });
