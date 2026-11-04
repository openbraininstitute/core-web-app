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

export type AdminPromotion = {
  id: string;
  code: string;
  description: string | null;
  credits_amount: number;
  validity_period_days: number;
  max_uses_per_user_per_period: number;
  max_total_uses: number | null;
  current_total_uses: number;
  active: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AdminPromotionCreate = Pick<
  AdminPromotion,
  | 'code'
  | 'credits_amount'
  | 'validity_period_days'
  | 'max_uses_per_user_per_period'
  | 'active'
  | 'valid_from'
  | 'valid_until'
> & { description?: string; max_total_uses?: number };

// The API skips a null here, so neither field can be cleared with one: send '' for the
// description, and a limit can't be removed at all.
export type AdminPromotionUpdate = {
  description?: string;
  active?: boolean;
  valid_until?: string;
  max_total_uses?: number;
};

export type AdminPromotionRedemption = {
  id: string;
  user_id: string;
  virtual_lab_id: string;
  virtual_lab_name: string | null;
  credits_granted: number;
  status: string;
  redeemed_at: string;
  error_message: string | null;
};

export type AdminPromotionUsage = {
  statistics: {
    total_redemptions: number;
    completed: number;
    pending: number;
    failed: number;
    total_credits_distributed: number;
    unique_users: number;
    unique_virtual_labs: number;
  };
  recent_redemptions: AdminPromotionRedemption[];
};

export type AdminPromotionAnalytics = {
  total_promotions: number;
  active_promotions: number;
  expired_promotions: number;
  total_redemptions: number;
  total_credits_distributed: number;
};
