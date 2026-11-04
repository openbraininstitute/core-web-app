// Wire shapes of virtual-lab-api's /admin routes. Three envelopes are in use: paged lists are
// bare `{ data, pagination }`, many details and writes are `{ message, data }`, and some
// return the object bare. `admin.ts` hands callers the payload either way.

export type MessageEnvelope<T> = { message: string; data: T };

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

// The API also accepts `waitlisted`, but silently assigns the member group for it.
export type UserRole = 'admin' | 'member';

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
  role: UserRole;
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
  card_brand: string;
  card_last4: string;
  receipt_url: string | null;
  virtual_lab_id: string | null;
};

export type AdminPaymentsPage = { total_count: number; payments: AdminPayment[] };

// Subscriptions and payments of one lab or one user.
export type BillingOwner = { virtual_lab_id: string } | { user_id: string };

type OwnerFilters = { virtual_lab_id?: string; user_id?: string };

export type SubscriptionFilters = OwnerFilters & { status?: string };

export type PaymentFilters = OwnerFilters & {
  payment_type?: string;
  card_last4?: string;
  start_date?: string;
  end_date?: string;
};

export type ComputeCell = AdminLab['compute_cell'];

// Stripe ids and amounts can't be edited here: they come from Stripe through a seeding script.
export type AdminPlan = {
  id: string;
  tier: string;
  name: string;
  description: string | null;
  active: boolean;
  currency: string;
  monthly_amount: number;
  monthly_discount: number | null;
  yearly_amount: number;
  yearly_discount: number | null;
  monthly_credits: number;
  yearly_credits: number;
};

export type AdminPlanUpdate = Partial<
  Pick<
    AdminPlan,
    | 'name'
    | 'description'
    | 'active'
    | 'monthly_credits'
    | 'yearly_credits'
    | 'monthly_discount'
    | 'yearly_discount'
  >
>;

// `rate` is a decimal string, kept as one so it stays exact.
export type AdminCreditRate = {
  id: string;
  currency: string;
  min_credits: number;
  max_credits: number | null;
  rate: string;
  discount_pct: number;
  active: boolean;
};

export type AdminCreditRateUpdate = Partial<
  Pick<AdminCreditRate, 'rate' | 'discount_pct' | 'max_credits' | 'active'>
>;
