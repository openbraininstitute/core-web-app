import type { TUserRole } from '@/api/virtual-lab-svc/validation';

// Wire shapes of virtual-lab-api's /admin routes. Three envelopes are in use: paged lists are
// bare `{ data, pagination }`, many details and writes are `{ message, data }`, and some
// return the object bare. `admin.ts` hands callers the payload either way.

export type Paged<T> = {
  data: T[];
  pagination: { page: number; size: number; page_size: number; total: number };
};

export type PageParams = {
  page?: number;
  page_size?: number;
  order_by?: string;
  order_direction?: string;
};

export type DeletedScope = { include_deleted?: boolean; deleted_only?: boolean };

export type AdminLab = {
  id: string;
  name: string;
  description: string;
  reference_email: string | null;
  email_verified: boolean;
  entity: string;
  compute_cell: 'cell_a' | 'cell_b';
  created_at: string;
  updated_at: string | null;
  projects_count: number | null;
  owner_id: string;
  deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminLabUpdate = Partial<
  Pick<AdminLab, 'name' | 'description' | 'entity'> & { reference_email: string | null }
>;

export type AdminMember = {
  id: string | null;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name: string;
  invite_accepted: boolean;
  role: TUserRole;
};

export type AdminLabInvite = {
  id: string;
  user_email: string;
  role: string;
  inviter_id: string;
  accepted: boolean | null;
  created_at: string;
};

export type AdminProject = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  virtual_lab_id: string;
  virtual_lab_name: string | null;
  owner_id: string;
  deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type AdminProjectUpdate = { name?: string; description?: string };

export type AdminUser = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  emailVerified: boolean;
  createdTimestamp: number | null;
  enabled: boolean;
};

export type AdminUserProjectMembership = {
  id: string;
  name: string | null;
  virtual_lab_id: string | null;
  role: string;
};

export type AdminUserDetails = {
  user: AdminUser;
  groups: string[];
  virtual_labs: { id: string; name: string | null; role: string }[];
  projects: AdminUserProjectMembership[];
};

export type AdminSubscription = {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  type: string;
  user_id: string;
  virtual_lab_id: string | null;
  tier: string | null;
};

export type AdminPayment = {
  id: string;
  amount_paid: number;
  currency: string;
  credits_purchased: number | null;
  status: string;
  payment_date: string;
  payment_type: string;
  receipt_url: string | null;
  virtual_lab_id: string | null;
};

export type AdminPaymentsPage = { total_count: number; payments: AdminPayment[] };

// Subscriptions and payments of one lab or one user.
export type BillingOwner = { virtual_lab_id: string } | { user_id: string };
