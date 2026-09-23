import type { ImagePickerAsset } from 'expo-image-picker';
import { File as ExpoFile } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { supabase } from './supabase';

const apiUrl = process.env.EXPO_PUBLIC_AWS_API_URL?.replace(/\/$/, '');

export const isAwsUploadsConfigured = Boolean(apiUrl);

async function request(path: string, init: RequestInit = {}, requireAuthentication = true) {
  if (!apiUrl) throw new Error('AWS uploads are not configured. Add EXPO_PUBLIC_AWS_API_URL.');
  const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
  if (requireAuthentication && !data.session?.access_token) throw new Error('Please sign in before uploading a photo.');
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}), ...(init.headers ?? {}) },
    });
  } catch (cause) {
    throw new Error(`Could not reach the AWS upload API (${path}). ${cause instanceof Error ? cause.message : 'Check your connection.'}`);
  }
  if (!response.ok) throw new Error((await response.text()) || `AWS request failed (${response.status}).`);
  return response.json();
}

export type IssuePhoto = { url: string; contentType: string };

export async function getIssuePhotoUrls(issueId: string): Promise<IssuePhoto[]> {
  const result = await request('/uploads/view', {
    method: 'POST',
    body: JSON.stringify({ issueId }),
  }, false) as { photos?: IssuePhoto[] };
  return result.photos ?? [];
}

export async function deleteIssueWithPhotos(issueId: string) {
  await request('/issues/delete', {
    method: 'POST',
    body: JSON.stringify({ issueId }),
  });
}

export async function uploadIssuePhoto(issueId: string, asset: ImagePickerAsset) {
  if (!asset.mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType)) {
    throw new Error('Please choose a JPEG, PNG, or WebP image.');
  }
  if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
    throw new Error('Photos must be 10 MB or smaller.');
  }

  const presigned = await request('/uploads/presign', {
    method: 'POST',
    body: JSON.stringify({ issueId, fileName: asset.fileName ?? 'issue-photo', contentType: asset.mimeType, fileSize: asset.fileSize ?? 0 }),
  }) as { uploadUrl: string; objectKey: string };

  const body = asset.file ?? new ExpoFile(asset.uri);
  let upload: Response;
  try { upload = await expoFetch(presigned.uploadUrl, { method: 'PUT', headers: { 'Content-Type': asset.mimeType }, body }); }
  catch (cause) { throw new Error(`Could not upload the photo to AWS S3. ${cause instanceof Error ? cause.message : 'Check your connection and try again.'}`); }
  if (!upload.ok) throw new Error('The photo upload failed. Please try again.');

  return request('/uploads/complete', {
    method: 'POST',
    body: JSON.stringify({ issueId, objectKey: presigned.objectKey, contentType: asset.mimeType, fileSize: asset.fileSize ?? 0 }),
  });
}
