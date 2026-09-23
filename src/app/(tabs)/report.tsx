import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IssueMap, type Coordinate } from '../../IssueMap';
import { createIssue, getCategories } from '../../issues';
import { useSession } from '../../session';
import { isSupabaseConfigured } from '../../supabase';
import { isAwsUploadsConfigured, uploadIssuePhoto } from '../../aws';
import { colors } from '../../theme';
import { ActionButton, categoryIcons } from '../../ui';

type Category = { id: string; name: string; slug: string; icon: string };
const draftKey = 'civicfix.report-draft.v1';
export default function Report() {
  const params = useLocalSearchParams<{ category?: string }>();
  const { user } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState<Coordinate | null>(null);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const chosenCategory = category || params.category || '';
  useEffect(() => { if (!isSupabaseConfigured) return; getCategories().then(data => setCategories(data as Category[])).catch(() => setError('Categories could not be loaded. Reopen the form to retry.')); AsyncStorage.getItem(draftKey).then(raw => { if (!raw) return; const draft = JSON.parse(raw); setTitle(draft.title ?? ''); setDescription(draft.description ?? ''); setAddress(draft.address ?? ''); setPoint(draft.point ?? null); if (!params.category) setCategory(draft.category ?? ''); }).catch(() => undefined); }, [params.category]);
  const getCurrentLocation = async () => { setLocationLoading(true); try { const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== 'granted') { Alert.alert('Location permission needed', 'Enter the street address manually or allow location in device settings.'); return; } const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }); const next = { latitude: result.coords.latitude, longitude: result.coords.longitude }; setPoint(next); if (Platform.OS !== 'web') { const places = await Location.reverseGeocodeAsync(next); const place = places[0]; if (place) setAddress([place.streetNumber, place.street, place.district, place.city, place.region].filter(Boolean).join(', ')); } } catch { Alert.alert('Could not find location', 'Enter an address manually and try again.'); } finally { setLocationLoading(false); } };
  const saveDraft = async () => { await AsyncStorage.setItem(draftKey, JSON.stringify({ category: chosenCategory, title, description, address, point })); Alert.alert('Draft saved', 'Your details are stored on this device.'); };
  const choosePhoto = async (camera: boolean) => {
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission needed', camera ? 'Allow camera access to take a report photo.' : 'Allow photo access to attach an existing image.');
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (!result.canceled) {
        setPhoto(result.assets[0]);
        if (camera && !point) await getCurrentLocation();
      }
    } catch { Alert.alert('Could not add photo', 'Please try again or choose a photo from your library.'); }
  };
  const submit = async () => {
    if (!isSupabaseConfigured) return setError('Add Supabase settings to submit reports.');
    if (!user) return router.push('/account');
    const selected = categories.find(item => item.slug === chosenCategory);
    if (!selected) return setError('Choose a category.');
    if (title.trim().length < 5) return setError('Add a title of at least 5 characters.');
    if (description.trim().length < 10) return setError('Add at least 10 characters of detail.');
    if (address.trim().length < 5) return setError('Add a street address or landmark.');
    setError(''); setLoading(true);
    try { const created = await createIssue({ categoryId: selected.id, title, description, address, latitude: point?.latitude, longitude: point?.longitude }); if (photo) { if (!isAwsUploadsConfigured) throw new Error('Photo uploads are not configured. Remove the photo or configure AWS uploads.'); await uploadIssuePhoto(created.id, photo); } await AsyncStorage.removeItem(draftKey); setTitle(''); setDescription(''); setAddress(''); setPoint(null); setPhoto(null); setCategory(''); router.replace(`/issue/${created.id}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit the report. Please try again.'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView edges={['top']} style={s.safe}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><Text style={s.eyebrow}>NEW REPORT</Text><Text style={s.title}>Tell us what needs attention.</Text><Text style={s.lead}>Clear details and a location help the right team respond.</Text>
    {!user && <Pressable onPress={() => router.push('/account')} style={s.signIn}><Ionicons name="lock-closed-outline" size={20} color={colors.accent} /><View style={{ flex: 1 }}><Text style={s.signInTitle}>Sign in before submitting</Text><Text style={s.signInText}>You can prepare and save a draft first.</Text></View><Ionicons name="chevron-forward" size={17} color={colors.accent} /></Pressable>}
    <View style={s.section}><View style={s.step}><Text style={s.stepNumber}>01</Text><Text style={s.stepTitle}>Choose a category</Text></View><View style={s.categories}>{categories.length ? categories.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: chosenCategory === item.slug }} onPress={() => setCategory(item.slug)} style={[s.category, chosenCategory === item.slug && s.categoryActive]}><Ionicons name={categoryIcons[item.slug] ?? 'help-circle-outline'} size={20} color={chosenCategory === item.slug ? colors.accent : colors.inkSoft} /><Text style={[s.categoryText, chosenCategory === item.slug && { color: colors.accent }]}>{item.name}</Text></Pressable>) : <Text style={s.helper}>{isSupabaseConfigured ? 'Loading categories…' : 'Connect Supabase to load categories.'}</Text>}</View></View>
    <View style={s.section}><View style={s.step}><Text style={s.stepNumber}>02</Text><Text style={s.stepTitle}>Describe the problem</Text></View><Text style={s.label}>Short title</Text><TextInput value={title} onChangeText={setTitle} maxLength={140} placeholder="e.g. Streetlight out near the market" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Report title" /><Text style={s.hint}>Keep it specific so others can recognise the issue.</Text><Text style={s.label}>What happened?</Text><TextInput value={description} onChangeText={setDescription} maxLength={2000} multiline textAlignVertical="top" placeholder="Describe what you saw and when it started." placeholderTextColor={colors.muted} style={[s.input, s.textarea]} accessibilityLabel="Report description" /></View>
    <View style={s.section}><View style={s.step}><Text style={s.stepNumber}>03</Text><Text style={s.stepTitle}>Add photo evidence</Text></View><Text style={s.helper}>Take a live photo or choose one from your phone. Photos are uploaded privately to AWS S3.</Text>{photo ? <View style={s.photoAttached}><Ionicons name="image-outline" size={20} color={colors.accent} /><View style={s.photoDetails}><Text style={s.photoTitle}>Photo attached</Text><Text style={s.photoName}>{photo.fileName ?? 'Issue photo'}</Text></View><Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remove photo"><Ionicons name="close-circle-outline" size={22} color={colors.danger} /></Pressable></View> : <View style={s.photoActions}><ActionButton label="Take picture" icon="camera-outline" onPress={() => choosePhoto(true)} secondary /><ActionButton label="Choose photo" icon="image-outline" onPress={() => choosePhoto(false)} secondary /></View>}</View>
    <View style={s.section}><View style={s.step}><Text style={s.stepNumber}>04</Text><Text style={s.stepTitle}>Pin the location</Text></View><Text style={s.helper}>Use your location or tap the map to place a pin. A camera capture automatically asks for your current location.</Text><View style={s.map}><IssueMap selected={point} center={point} onPick={setPoint} /></View><View style={s.locationRow}><ActionButton label={locationLoading ? 'Finding location…' : 'Use my location'} icon="locate-outline" onPress={getCurrentLocation} secondary disabled={locationLoading} />{point && <Text style={s.coordinate}>Geotag saved · {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}</Text>}</View><Text style={s.label}>Street address or landmark</Text><TextInput value={address} onChangeText={setAddress} maxLength={300} placeholder="Street, nearby landmark, ward" placeholderTextColor={colors.muted} style={s.input} accessibilityLabel="Report address" /></View>
    {error ? <View style={s.error}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={s.errorText}>{error}</Text></View> : null}<View style={s.actions}><ActionButton label="Save draft" icon="bookmark-outline" onPress={saveDraft} secondary /><ActionButton label={loading ? 'Submitting…' : 'Submit report'} icon="arrow-forward" onPress={submit} disabled={loading} /></View><Text style={s.footnote}>Reports are public. Your account email is never shown with a report.</Text>
  </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper }, content: { maxWidth: 800, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 45 }, eyebrow: { color: colors.accent, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 }, title: { color: colors.ink, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 29, lineHeight: 34, letterSpacing: -1, marginTop: 7, maxWidth: 370 }, lead: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 }, signIn: { backgroundColor: colors.accentSoft, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, signInTitle: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13 }, signInText: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 }, section: { marginTop: 23 }, step: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 }, stepNumber: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.accent, color: colors.accentInk, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, lineHeight: 34 }, stepTitle: { fontFamily: 'SpaceGrotesk_700Bold', color: colors.ink, fontSize: 19 }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, category: { width: '48%', minHeight: 55, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule }, categoryActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, categoryText: { flex: 1, color: colors.inkSoft, fontFamily: 'Inter_600SemiBold', fontSize: 12 }, label: { fontFamily: 'Inter_600SemiBold', color: colors.ink, fontSize: 13, marginBottom: 9, marginTop: 15 }, input: { minHeight: 49, borderRadius: 13, paddingHorizontal: 14, backgroundColor: colors.paperRaised, borderWidth: 1, borderColor: colors.rule, color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 14 }, textarea: { height: 110, paddingTop: 13 }, hint: { color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 19 }, helper: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19, marginBottom: 11 }, photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, photoAttached: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 13, backgroundColor: colors.accentSoft }, photoDetails: { flex: 1 }, photoTitle: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13 }, photoName: { color: colors.inkSoft, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 }, map: { marginTop: 4 }, locationRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, coordinate: { color: colors.accent, fontFamily: 'Inter_500Medium', fontSize: 11 }, error: { flexDirection: 'row', gap: 8, backgroundColor: colors.dangerSoft, padding: 14, borderRadius: 12, marginTop: 22 }, errorText: { flex: 1, color: colors.danger, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18 }, actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 9, marginTop: 27 }, footnote: { color: colors.muted, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 18 } });
