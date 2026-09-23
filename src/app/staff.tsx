import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteIssue, getStaffWorkspace, updateIssueStatus } from '../issues';
import { IssuePhotos } from '../IssuePhotos';
import { colors } from '../theme';
import type { IssueStatus, PublicIssue } from '../types';
import { ActionButton, EmptyState, StatusBadge, dateLabel, statusLabel } from '../ui';

const options: IssueStatus[] = ['assigned', 'in_progress', 'resolved', 'needs_information', 'rejected'];

export default function Staff() {
  const [issues, setIssues] = useState<PublicIssue[]>([]);
  const [selected, setSelected] = useState<PublicIssue | null>(null);
  const [status, setStatus] = useState<IssueStatus>('assigned');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [role, setRole] = useState<'staff' | 'admin' | null>(null);
  const [error, setError] = useState('');
  const canDelete = role === 'admin' || role === 'staff';

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaffWorkspace();
      setIssues(data.issues);
      setRole(data.role);
      const first = data.issues[0] ?? null;
      setSelected(first);
      setStatus(first?.status === 'new' ? 'assigned' : first?.status ?? 'assigned');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const choose = (item: PublicIssue) => {
    setSelected(item);
    setStatus(item.status === 'new' ? 'assigned' : item.status);
    setMessage('');
    setError('');
  };

  const publish = async () => {
    if (!selected) return;
    if (selected.status === status) return setError('Choose a new status before publishing.');
    if (message.trim().length < 5) return setError('Write a public update of at least 5 characters.');
    setSaving(true);
    setError('');
    try {
      await updateIssueStatus(selected.id, status, message);
      setMessage('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish the update.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (issue: PublicIssue) => {
    if (!canDelete) return;
    setDeletingId(issue.id);
    setError('');
    try {
      await deleteIssue(issue.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the report.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (issue: PublicIssue) => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Permanently delete ${issue.public_id}, its report history, and attached photos?`)) void remove(issue);
      return;
    }
    Alert.alert('Delete report?', `This permanently deletes ${issue.public_id} and its progress history.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void remove(issue); } },
    ]);
  };

  return <SafeAreaView edges={['top', 'bottom']} style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/account')} style={s.back}><Ionicons name="arrow-back" size={20} color={colors.ink} /><Text style={s.backText}>Account</Text></Pressable>
    <Text style={s.eyebrow}>DEPARTMENT WORKSPACE</Text>
    <Text style={s.title}>{role === 'admin' ? 'Admin report management' : 'Report queue'}</Text>
    <Text style={s.lead}>{role === 'admin' ? 'View every CivicFix report, publish updates, and remove reports when necessary.' : 'Review assigned reports and publish clear progress updates.'}</Text>
    {loading ? <ActivityIndicator color={colors.accent} style={{ margin: 40 }} /> : error && !selected ? <EmptyState icon="lock-closed-outline" title="Workspace unavailable" detail={error} /> : <>
      {role === 'admin' && <View style={s.adminSection}><Ionicons name="shield-checkmark-outline" size={21} color={colors.accent} /><View style={{ flex: 1 }}><Text style={s.adminTitle}>All reports</Text><Text style={s.adminText}>Admin access · {issues.length} reports across all departments</Text></View></View>}
      <View style={s.queue}>
        <Text style={s.sectionTitle}>{role === 'admin' ? 'All reports' : 'Assigned reports'} · {issues.length}</Text>
        {issues.length ? issues.map(item => <View key={item.id} style={s.queueRow}>
          <Pressable onPress={() => choose(item)} style={[s.queueItem, selected?.id === item.id && s.queueSelected]}>
            <View style={{ flex: 1 }}><Text style={s.queueId}>{item.public_id} · {dateLabel(item.updated_at)}</Text><Text style={s.queueTitle}>{item.title}</Text><Text style={s.queueAddress}>{item.address}</Text></View><StatusBadge status={item.status} />
          </Pressable>
          {canDelete && <Pressable onPress={() => confirmDelete(item)} disabled={Boolean(deletingId)} accessibilityLabel={`Delete ${item.public_id}`} style={({ pressed }) => [s.deleteButton, pressed && { opacity: .7 }, deletingId && { opacity: .5 }]}><Ionicons name="trash-outline" size={19} color={colors.danger} /></Pressable>}
        </View>) : <EmptyState icon="file-tray-outline" title="Queue is clear" detail="Reports routed to your department will appear here." />}
      </View>
      {selected && <View style={s.detail}>
        <Text style={s.eyebrow}>SELECTED REPORT · {selected.public_id}</Text><Text style={s.detailTitle}>{selected.title}</Text><Text style={s.body}>{selected.description}</Text><IssuePhotos issueId={selected.id} /><View style={s.rule} />
        <Text style={s.label}>New status</Text><View style={s.options}>{options.map(item => <Pressable key={item} onPress={() => setStatus(item)} style={[s.option, status === item && s.optionActive]}><Text style={[s.optionText, status === item && s.optionTextActive]}>{statusLabel[item]}</Text></Pressable>)}</View>
        <Text style={s.label}>Public update</Text><TextInput multiline textAlignVertical="top" value={message} onChangeText={setMessage} maxLength={1000} placeholder="Explain what happens next for residents." placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Public progress update" />
        {error ? <Text style={s.error}>{error}</Text> : null}<View style={s.publish}><ActionButton label={saving ? 'Publishing…' : 'Publish update'} icon="send-outline" onPress={publish} disabled={saving || Boolean(deletingId)} /></View>
      </View>}
    </>}
  </ScrollView></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper }, content: { maxWidth: 800, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 40 }, back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 }, backText: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13 }, eyebrow: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.3 }, title: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 30, marginTop: 6 }, lead: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 6, marginBottom: 24 }, adminSection: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accentSoft, borderRadius: 16, padding: 15, marginBottom: 14 }, adminTitle: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 14 }, adminText: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 }, queue: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule, borderRadius: 19, padding: 16 }, sectionTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 19, marginBottom: 13 }, queueRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 8 }, queueItem: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.rule }, queueSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, deleteButton: { width: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.rule, backgroundColor: colors.paperSubtle, alignItems: 'center', justifyContent: 'center' }, queueId: { color: colors.muted, fontFamily: 'Inter_500Medium', fontSize: 11 }, queueTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, marginTop: 4 }, queueAddress: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 }, detail: { marginTop: 18, backgroundColor: colors.paperRaised, borderRadius: 19, borderWidth: 1, borderColor: colors.rule, padding: 19 }, detailTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, marginTop: 9 }, body: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 21, marginTop: 10 }, rule: { borderTopWidth: 1, borderColor: colors.rule, marginTop: 19 }, label: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 19, marginBottom: 9 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, option: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: colors.rule }, optionActive: { backgroundColor: colors.accent, borderColor: colors.accent }, optionText: { color: colors.inkSoft, fontFamily: 'Inter_500Medium', fontSize: 12 }, optionTextActive: { color: colors.accentInk }, input: { height: 90, borderWidth: 1, borderColor: colors.rule, borderRadius: 13, padding: 13, color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 13 }, error: { color: colors.danger, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 10 }, publish: { alignSelf: 'flex-start', marginTop: 17 },
});
