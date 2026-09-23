import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { getIssuePhotoUrls, type IssuePhoto } from './aws';
import { colors } from './theme';

export function IssuePhotos({ issueId }: { issueId: string }) {
  const [result, setResult] = useState<{ issueId: string; photos: IssuePhoto[] } | null>(null);

  useEffect(() => {
    let active = true;
    getIssuePhotoUrls(issueId)
      .then((photos) => { if (active) setResult({ issueId, photos }); })
      .catch(() => { if (active) setResult({ issueId, photos: [] }); });
    return () => { active = false; };
  }, [issueId]);

  if (result?.issueId !== issueId) return <ActivityIndicator color={colors.accent} style={s.loading} />;
  if (!result.photos.length) return null;
  return <View style={s.container}>{result.photos.map((photo) => <Image key={photo.url} source={{ uri: photo.url }} accessibilityLabel="Photo attached to this report" resizeMode="cover" style={s.image} />)}</View>;
}

const s = StyleSheet.create({
  loading: { marginTop: 18, alignSelf: 'flex-start' },
  container: { gap: 10, marginTop: 20 },
  image: { width: '100%', height: 250, borderRadius: 16, backgroundColor: colors.paperRaised },
});
