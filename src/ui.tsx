/* Hallmark · pre-emit critique: P5 H4 E4 S5 R5 V4 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';
import type { IssueStatus, PublicIssue } from './types';

export const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  'roads-potholes': 'construct-outline', streetlights: 'bulb-outline', 'garbage-waste': 'trash-outline',
  'water-drainage': 'water-outline', 'public-spaces': 'leaf-outline', other: 'ellipsis-horizontal-outline',
};
export const statusLabel: Record<IssueStatus, string> = { new: 'Received', assigned: 'Assigned', in_progress: 'In progress', resolved: 'Resolved', rejected: 'Closed', needs_information: 'Needs detail' };
const statusColor: Record<IssueStatus, [string, string]> = {
  new: [colors.accent, colors.accentSoft], assigned: [colors.warning, colors.warningSoft],
  in_progress: [colors.warning, colors.warningSoft], resolved: [colors.success, colors.successSoft],
  rejected: [colors.muted, colors.paperSubtle], needs_information: [colors.danger, colors.dangerSoft],
};
export const dateLabel = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function StatusBadge({ status }: { status: IssueStatus }) {
  const [ink, bg] = statusColor[status];
  return <View style={[styles.badge, { backgroundColor: bg }]}><View style={[styles.dot, { backgroundColor: ink }]} /><Text style={[styles.badgeText, { color: ink }]}>{statusLabel[status]}</Text></View>;
}
export function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.heading}><View>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text style={styles.headingTitle}>{title}</Text></View>{action && <Pressable onPress={onAction} accessibilityRole="button" style={styles.headingAction}><Text style={styles.actionText}>{action}</Text><Ionicons name="arrow-forward" size={16} color={colors.accent} /></Pressable>}</View>;
}
export function ActionButton({ label, icon, onPress, secondary, disabled }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, pressed && { opacity: .82 }, disabled && { opacity: .5 }]}>{icon && <Ionicons name={icon} size={18} color={secondary ? colors.accent : colors.accentInk} />}<Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text></Pressable>;
}
export function IssueCard({ issue, compact }: { issue: PublicIssue; compact?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={() => router.push(`/issue/${issue.id}`)} style={({ pressed }) => [styles.issue, pressed && { opacity: .8 }]}><View style={styles.issueTop}><View style={styles.issueIcon}><Ionicons name={categoryIcons[issue.category?.slug ?? ''] ?? 'alert-circle-outline'} size={21} color={colors.accent} /></View><View style={styles.issueBody}><Text style={styles.issueCategory}>{issue.category?.name ?? 'Civic issue'} · {issue.public_id}</Text><Text style={styles.issueTitle} numberOfLines={compact ? 2 : undefined}>{issue.title}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.muted} /></View><View style={styles.issueBottom}><View style={styles.location}><Ionicons name="location-outline" size={15} color={colors.muted} /><Text style={styles.locationText} numberOfLines={1}>{issue.address}</Text></View><StatusBadge status={issue.status} /></View></Pressable>;
}
export function EmptyState({ icon, title, detail, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; action?: string; onAction?: () => void }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name={icon} size={26} color={colors.accent} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text>{action && onAction && <ActionButton label={action} onPress={onAction} secondary />}</View>;
}

export const styles = StyleSheet.create({
  eyebrow: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.7, marginBottom: 7 },
  heading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  headingTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 23, letterSpacing: -.6 },
  headingAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7 },
  actionText: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  button: { minHeight: 48, borderRadius: 14, backgroundColor: colors.accent, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  buttonSecondary: { backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule },
  buttonText: { color: colors.accentInk, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  buttonTextSecondary: { color: colors.accent },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 }, badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  issue: { backgroundColor: colors.paperRaised, borderRadius: 18, borderWidth: 1, borderColor: colors.rule, padding: 16, marginBottom: 10 },
  issueTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  issueIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  issueBody: { flex: 1 }, issueCategory: { color: colors.muted, fontFamily: 'Inter_500Medium', fontSize: 11, marginBottom: 4 },
  issueTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16, lineHeight: 22 },
  issueBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 15 },
  location: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }, locationText: { flex: 1, color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 12 },
  empty: { backgroundColor: colors.paperRaised, borderRadius: 20, borderWidth: 1, borderColor: colors.rule, padding: 28, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 17, textAlign: 'center' },
  emptyDetail: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 8 },
});
