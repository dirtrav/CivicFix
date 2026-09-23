import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPublicIssues } from '../../issues';
import { isSupabaseConfigured } from '../../supabase';
import { colors } from '../../theme';
import type { PublicIssue } from '../../types';
import { ActionButton, EmptyState, IssueCard, SectionHeading, categoryIcons } from '../../ui';

const categories = [
  ['Roads & potholes', 'roads-potholes'], ['Streetlights', 'streetlights'], ['Garbage & waste', 'garbage-waste'],
  ['Water & drainage', 'water-drainage'], ['Public spaces', 'public-spaces'], ['Other issue', 'other'],
] as const;
export default function Home() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!isSupabaseConfigured) { setLoading(false); setError('Connect Supabase to see public reports.'); return; }
    setLoading(true);
    getPublicIssues().then(data => { if (active) { setIssues(data); setError(''); } }).catch(() => { if (active) setError('Could not load reports. Pull down or reopen Home to retry.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));
  return <SafeAreaView style={s.safe} edges={['top']}><ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.top}><View style={s.brandIcon}><Ionicons name="location" size={18} color={colors.accentInk} /></View><Text style={s.brand}>CivicFix</Text><Pressable accessibilityLabel="Open account" onPress={() => router.push('/account')} style={s.profile}><Ionicons name="person-outline" size={19} color={colors.accent} /></Pressable></View>
    <View style={s.hero}><View style={s.heroMark}><View style={s.heroDot} /><Text style={s.heroEyebrow}>YOUR CITY, IN VIEW</Text></View><Text style={s.heroTitle}>A better street starts with a report.</Text><Text style={s.heroText}>Spot a problem, pin the place, and follow its progress from your phone.</Text><View style={s.heroButton}><ActionButton label="Report an issue" icon="add" onPress={() => router.push('/report')} /></View><View style={s.heroGraphic}><View style={s.graphicLine} /><View style={s.graphicPin}><Ionicons name="location" size={30} color={colors.accentInk} /></View><View style={[s.graphicNode, { left: 24, top: 22 }]} /><View style={[s.graphicNode, { right: 16, bottom: 14 }]} /></View></View>
    <View style={s.section}><SectionHeading eyebrow="QUICK START" title="What needs fixing?" /><View style={s.categoryGrid}>{categories.map(([name, slug]) => <Pressable key={slug} accessibilityRole="button" onPress={() => router.push({ pathname: '/report', params: { category: slug } })} style={({ pressed }) => [s.category, pressed && { opacity: .75 }]}><View style={s.categoryIcon}><Ionicons name={categoryIcons[slug]} size={22} color={colors.accent} /></View><Text style={s.categoryName}>{name}</Text><Ionicons name="arrow-forward" size={15} color={colors.muted} /></Pressable>)}</View></View>
    <View style={s.section}><SectionHeading eyebrow="PUBLIC TRACKER" title="Recent reports" action="See map" onAction={() => router.push('/explore')} />{loading ? <ActivityIndicator color={colors.accent} style={{ margin: 30 }} /> : error ? <EmptyState icon="cloud-offline-outline" title="Reports unavailable" detail={error} /> : issues.length ? issues.slice(0, 4).map(item => <IssueCard key={item.id} issue={item} compact />) : <EmptyState icon="checkmark-circle-outline" title="No public reports yet" detail="When residents report issues, you’ll see their progress here." action="Make the first report" onAction={() => router.push('/report')} />}</View>
    <View style={s.how}><Text style={s.howTitle}>How CivicFix works</Text><View style={s.howRow}><Text style={s.howNumber}>01</Text><Text style={s.howText}>Describe the issue and mark its location.</Text></View><View style={s.howRow}><Text style={s.howNumber}>02</Text><Text style={s.howText}>The matching department receives your report.</Text></View><View style={s.howRow}><Text style={s.howNumber}>03</Text><Text style={s.howText}>Follow updates in My reports.</Text></View></View>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper }, content: { width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  top: { height: 66, flexDirection: 'row', alignItems: 'center', gap: 10 }, brandIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brand: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 21, flex: 1 }, profile: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: colors.graphite, borderRadius: 26, padding: 24, minHeight: 290, overflow: 'hidden' },
  heroMark: { flexDirection: 'row', alignItems: 'center', gap: 8 }, heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#9BDBAC' }, heroEyebrow: { color: '#B7D8C2', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.6 },
  heroTitle: { color: '#FFFFFF', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 32, lineHeight: 36, maxWidth: 300, marginTop: 20, letterSpacing: -1 },
  heroText: { color: '#D3E4D8', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 21, maxWidth: 285, marginTop: 11 }, heroButton: { alignSelf: 'flex-start', marginTop: 23, zIndex: 2 },
  heroGraphic: { position: 'absolute', width: 142, height: 142, borderRadius: 71, borderWidth: 1, borderColor: '#4A7261', right: -42, bottom: -18, alignItems: 'center', justifyContent: 'center' },
  graphicLine: { position: 'absolute', width: 86, height: 86, borderRadius: 43, borderWidth: 1, borderColor: '#4A7261' }, graphicPin: { width: 55, height: 55, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, graphicNode: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#92C6A2' },
  section: { marginTop: 32 }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  category: { width: '48.3%', minHeight: 106, borderRadius: 17, backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule, padding: 13, justifyContent: 'space-between', alignItems: 'flex-start' },
  categoryIcon: { width: 33, height: 33, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, categoryName: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 7 },
  how: { marginTop: 28, padding: 21, borderRadius: 20, backgroundColor: colors.paperSubtle }, howTitle: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.ink, fontSize: 18, marginBottom: 12 },
  howRow: { flexDirection: 'row', gap: 15, borderTopWidth: 1, borderColor: colors.ruleStrong, paddingVertical: 12 }, howNumber: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.accent, fontSize: 14 }, howText: { flex: 1, fontFamily: 'Inter_400Regular', color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
});
