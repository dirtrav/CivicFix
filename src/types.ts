export type IssueStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'needs_information';
export type UserRole = 'citizen' | 'staff' | 'admin';

export type PublicIssue = {
  id: string;
  public_id: string;
  title: string;
  description: string;
  status: IssueStatus;
  address: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  category: { name: string; slug: string; icon: string } | null;
  department: { name: string } | null;
};
