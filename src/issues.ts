import { supabase } from './supabase';
import { deleteIssueWithPhotos } from './aws';
import type { IssueStatus, PublicIssue } from './types';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.');
  return supabase;
};

export async function getPublicIssues(status?: IssueStatus): Promise<PublicIssue[]> {
  const client = requireClient();
  let query = client.from('issues_public').select('*').order('updated_at', { ascending: false }).limit(30);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PublicIssue[];
}

export async function getIssue(id: string): Promise<PublicIssue | null> {
  const { data, error } = await requireClient().from('issues_public').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as PublicIssue | null;
}

export async function getMyIssues(): Promise<PublicIssue[]> {
  const client = requireClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await client.from('issues').select('id, public_id, title, description, status, address, latitude, longitude, created_at, updated_at, categories(name, slug, icon), departments(name)').eq('reporter_id', auth.user.id).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, category: row.categories, department: row.departments })) as PublicIssue[];
}

export async function getIssueUpdates(issueId: string) {
  const { data, error } = await requireClient().from('issue_updates').select('id, status, public_message, created_at').eq('issue_id', issueId).eq('is_public', true).order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getStaffWorkspace() {
  const client = requireClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error('Sign in to open the workspace.');
  const { data: profile, error: profileError } = await client.from('profiles').select('role, department_id').eq('id', auth.user.id).single();
  if (profileError) throw profileError;
  if (!profile || profile.role === 'citizen') throw new Error('This workspace is for department staff.');
  let query = client.from('issues').select('id, public_id, title, description, status, address, latitude, longitude, created_at, updated_at, categories(name, slug, icon), departments(name)').order('updated_at', { ascending: false }).limit(100);
  if (profile.role === 'staff') query = query.eq('department_id', profile.department_id);
  const { data, error } = await query;
  if (error) throw error;
  return { role: profile.role as 'staff' | 'admin', issues: (data ?? []).map((row: any) => ({ ...row, category: row.categories, department: row.departments })) as PublicIssue[] };
}

export async function getCategories() {
  const client = requireClient();
  const { data, error } = await client.from('categories').select('id, name, slug, icon').eq('is_active', true).order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function createIssue(input: { categoryId: string; title: string; description: string; address: string; latitude?: number; longitude?: number }) {
  const client = requireClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error('Please sign in before submitting a report.');
  const { data, error } = await client.from('issues').insert({
    reporter_id: auth.user.id, category_id: input.categoryId, title: input.title.trim(), description: input.description.trim(),
    address: input.address.trim(), latitude: input.latitude ?? null, longitude: input.longitude ?? null,
  }).select('id, public_id').single();
  if (error) throw error;
  return data as { id: string; public_id: string };
}

export async function updateIssueStatus(issueId: string, status: IssueStatus, publicMessage: string) {
  const client = requireClient();
  const { error } = await client.rpc('update_issue_status', { p_issue_id: issueId, p_status: status, p_public_message: publicMessage.trim() });
  if (error) throw error;
}

export async function deleteIssue(issueId: string) {
  await deleteIssueWithPhotos(issueId);
}
