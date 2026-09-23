import { randomUUID } from 'node:crypto';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { APIGatewayProxyStructuredResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';

const bucket = process.env.UPLOADS_BUCKET!;
const s3 = new S3Client({ region: process.env.AWS_REGION, forcePathStyle: true });
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const json = (statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 => ({ statusCode, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });

async function supabaseRequest(path: string, token: string, init: RequestInit = {}) {
  return fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
}

async function userFor(event: APIGatewayProxyEventV2) {
  const token = event.headers?.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string };
  return user.id ? { user, token } : null;
}

function body(event: APIGatewayProxyEventV2) {
  try { return JSON.parse(event.body ?? '{}') as Record<string, unknown>; } catch { return null; }
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  console.info('civicfix.aws.request', { route: event.rawPath, method: event.requestContext.http.method });
  const auth = await userFor(event);
  if (!auth) return json(401, { error: 'Sign in required.' });
  const { user, token } = auth;
  const input = body(event);
  if (!input) return json(400, { error: 'Invalid JSON.' });

  if (event.rawPath === '/uploads/presign' && event.requestContext.http.method === 'POST') {
    const issueId = String(input.issueId ?? '');
    const contentType = String(input.contentType ?? '');
    const fileSize = Number(input.fileSize ?? 0);
    if (!issueId || !allowedTypes.has(contentType) || !Number.isFinite(fileSize) || fileSize <= 0 || fileSize > 10 * 1024 * 1024) return json(400, { error: 'Invalid photo or size.' });
    const issueResponse = await supabaseRequest(`issues?id=eq.${encodeURIComponent(issueId)}&reporter_id=eq.${encodeURIComponent(user.id!)}&select=id&limit=1`, token);
    const issues = issueResponse.ok ? await issueResponse.json() as Array<{ id: string }> : [];
    if (!issues.length) return json(403, { error: 'You can only attach photos to your own reports.' });
    const extension = contentType.split('/')[1];
    const objectKey = `issues/${issueId}/${user.id}/${randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: contentType }), { expiresIn: 300 });
    return json(200, { uploadUrl, objectKey });
  }

  if (event.rawPath === '/uploads/complete' && event.requestContext.http.method === 'POST') {
    const issueId = String(input.issueId ?? '');
    const objectKey = String(input.objectKey ?? '');
    const contentType = String(input.contentType ?? '');
    const fileSize = Number(input.fileSize ?? 0);
    if (!objectKey.startsWith(`issues/${issueId}/${user.id}/`) || !allowedTypes.has(contentType) || fileSize <= 0 || fileSize > 10 * 1024 * 1024) return json(400, { error: 'Invalid attachment.' });
    let uploaded: { ContentType?: string; ContentLength?: number };
    try { uploaded = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey })); } catch { return json(400, { error: 'Uploaded object was not found.' }); }
    if (uploaded.ContentType !== contentType || !uploaded.ContentLength || uploaded.ContentLength > 10 * 1024 * 1024) return json(400, { error: 'Uploaded photo metadata is invalid.' });
    const metadataResponse = await supabaseRequest('issue_attachments', token, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ issue_id: issueId, uploader_id: user.id, object_key: objectKey, content_type: uploaded.ContentType, byte_size: uploaded.ContentLength }) });
    if (!metadataResponse.ok) { console.error('civicfix.aws.attachment_insert_failed', await metadataResponse.text()); return json(500, { error: 'Could not save attachment metadata. Apply the AWS attachment migration in Supabase.' }); }
    const data = await metadataResponse.json() as Array<{ id: string; object_key: string }>;
    return json(201, data[0]);
  }

  return json(404, { error: 'Not found.' });
};
