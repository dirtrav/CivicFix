import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyIssues } from '../../issues';
import { useSession } from '../../session';
import { colors } from '../../theme';
import type { PublicIssue } from '../../types';
import { ActionButton, EmptyState, IssueCard } from '../../ui';

export default function Activity() {
  const { user } = useSession(); const [issues, setIssues] = useState<PublicIssue[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  useFocusEffect(useCallback(() => { if (!user) return; let active = true; setLoading(true); getMyIssues().then(data => { if (active) { setIssues(data); setError(''); } }).catch(() => { if (active) setError('Could not load your reports. Reopen My reports to retry.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [user]));
  return <SafeAreaView edges={['top']} style={s.safe}><ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>YOUR ACTIVITY</Text><Text style={s.title}>My reports</Text><Text style={s.lead}>Follow every report from submission to resolution.</Text><View style={s.action}><ActionButton label="New report" icon="add" onPress={() => router.push('/report')} /></View>{!user ? <EmptyState icon="person-circle-outline" title="Sign in to see your reports" detail="Reports you submit will appear here with their latest status." action="Sign in" onAction={() => router.push('/account')} /> : loading ? <ActivityIndicator color={colors.accent} style={{ margin: 40 }} /> : error ? <EmptyState icon="cloud-offline-outline" title="Reports unavailable" detail={error} /> : issues.length ? issues.map(item => <IssueCard key={item.id} issue={item} />) : <EmptyState icon="document-text-outline" title="No reports yet" detail="Your submitted issues and their updates will appear here." action="Create a report" onAction={() => router.push('/report')} />}</ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper }, content: { maxWidth: 800, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 40 }, eyebrow: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 }, title: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, letterSpacing: -1, marginTop: 6 }, lead: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 6 }, action: { alignSelf: 'flex-start', marginTop: 20, marginBottom: 25 } });
