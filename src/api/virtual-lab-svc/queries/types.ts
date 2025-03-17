export interface VlmResponse<T> {
  message: string;
  data: T | null;
}

export type ProjectCreationResponse = VlmResponse<{
  project: {
    id: string;
    nexus_project_id: string;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    virtual_lab_id: string;
    budget: number;
  };
  failed_invites: [
    {
      user_email: string;
      first_name: string;
      last_name: string;
      exists: boolean;
    },
  ];
}>;

export type VirtualLab = {
  name: string;
  description: string;
  reference_email: string;
  entity: string;
  id: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
};

export type VirtualLabExistsVerificationResponse = VlmResponse<{
  exists: boolean;
}>;

export type ProjectExistsVerificationResponse = VlmResponse<{
  exist: boolean;
}>;

export type ProjectUsersCountResponse = VlmResponse<{
  project_id: string;
  total: number;
}>;

export type InviteResponse = VlmResponse<{
  // TODO: include vlab as origin in virtual lab service
  origin?: 'Project';
  invite_id: string;
}>;

export type Invite = {
  email: string;
  role: string;
};

export type VirtualLabResponseData = {
  virtual_lab: VirtualLab;
  successful_invites: Invite[];
  failed_invites: Invite[];
};

export type VirtualLabResponse = VlmResponse<VirtualLabResponseData>;

export type VerificationCodeEmailResponseData = {
  message: string;
  status: 'registered' | 'verified' | 'locked' | 'code_sent' | 'expired' | 'error';
  remaining_time: number | null;
  remaining_attempts: number | null;
  verified_at?: Date | null;
};

export type VerificationCodeEmailResponse = VlmResponse<VerificationCodeEmailResponseData>;

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
}

export type PriceOption = {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  nickname?: string;
};

export type SubscriptionTier = {
  id: string;
  name: string;
  description?: string;
  prices: PriceOption[];
  metadata: Record<string, string>;
  sanity_id: string;
};

export type SubscriptionDetails = {
  id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  type: 'free' | 'paid';
};

export type CreateSubscriptionRequest = {
  tier_id: string;
  interval: string;
  payment_method_id: string;
  metadata?: Record<string, string>;
};

export type CreateSubscriptionResponse = {
  subscription: SubscriptionDetails;
};

export type GetSubscriptionResponse = {
  subscription: SubscriptionDetails;
};

export type CancelSubscriptionRequest = {
  reason?: string;
};

export type CancelSubscriptionResponse = {
  subscription: SubscriptionDetails;
};

export type SubscriptionTiersResponse = {
  tiers: Array<SubscriptionTier>;
};

export type VirtualLabListResponse = VlmResponse<{
  pending_labs: Array<VirtualLab & { invite_id: string }>;
  virtual_lab: VirtualLab;
  members_count: number | null;
  projects_count: number | null;
}>;

type SetupIntent = {
  id: string;
  client_secret: string;
  customer_id: string;
};
export type SetupIntentResponse = VlmResponse<SetupIntent>;

export type UserActiveSubscriptionResponse = {
  subscription: {
    id?: string;
    status?: SubscriptionStatus;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
    canceled_at?: string;
    next_billing_date?: string;
    type?: 'free' | 'paid';
  };
} | null;

export type NextPaymentDateResponse = {
  subscription_id: string;
  next_payment_date: string | null;
  current_period_end: string;
};

export type SubscriptionStatusResponse = {
  has_subscription: boolean;
  subscription_id: string | null;
  type: 'free' | 'paid';
  subscription_type: 'FREE' | 'PRO' | 'PREMIUM';
  status: string | null;
  current_period_end: string | null;
};

export type SubscriptionType = 'FREE' | 'PRO' | 'PREMIUM';

export type SubscriptionPaymentDetails = {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  payment_date: string;
  payment_type?: string;
  card_brand: string;
  card_last4: string;
  card_exp_month?: number;
  card_exp_year?: number;
  invoice_pdf: string | null;
  receipt_url: string | null;
  period_start: string;
  period_end: string;
  created_at?: string;
  updated_at?: string;
  is_standalone?: boolean;
};

/**
 * Response type for paginated subscription payments
 */
export type SubscriptionPaymentsResponse = VlmResponse<{
  total_count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  payments: SubscriptionPaymentDetails[];
}>;

export type UserSubscriptionHistory = {
  id: string;
  type: 'free' | 'paid';
  subscription_type: SubscriptionType;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  cancel_at_period_end?: boolean;
  total_paid: number;
  payments: SubscriptionPaymentDetails[];
};

export type UserSubscriptionsResponse = {
  subscriptions: UserSubscriptionHistory[];
  total_paid: number;
  total_subscriptions: number;
};

export type StandalonePaymentRequest = {
  amount: number;
  currency: string;
  virtual_lab_id: string;
  payment_method_id: string;
};

export type StandalonePaymentResponse = {
  amount: number;
  currency: string;
  status: string;
  receipt_url?: string;
  card_last4: string;
  card_brand: string;
};

export type UserProfile = {
  first_name: string | null;
  last_name: string | null;
  street: string | null;
  postal_code: string | null;
  locality: string | null;
  region: string | null;
  country: string | null;
};
export type UpdateUserProfileRequest = Partial<UserProfile>;

export type UserProfileResponse = {
  id: string;
  preferred_username: string;
  email: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  address: {
    street?: string;
    postal_code?: string;
    locality?: string;
    region?: string;
    country?: string;
  };
};
export type VlmStandalonePaymentResponse = VlmResponse<StandalonePaymentResponse>;
export type VlmGetSubscriptionResponse = VlmResponse<GetSubscriptionResponse>;
export type VlmCreateSubscriptionResponse = VlmResponse<CreateSubscriptionResponse>;
export type VlmCancelSubscriptionResponse = VlmResponse<CancelSubscriptionResponse>;
export type VlmUserSubscriptionResponse = VlmResponse<UserActiveSubscriptionResponse>;
export type VlmNextPaymentDateResponse = VlmResponse<NextPaymentDateResponse>;
export type VlmSubscriptionStatusResponse = VlmResponse<SubscriptionStatusResponse>;
export type VlmUserSubscriptionsResponse = VlmResponse<UserSubscriptionsResponse>;
export type VlmListSubscriptionResponse = VlmResponse<Array<SubscriptionDetails>>;
export type VlmListSubscriptionTiersResponse = VlmResponse<SubscriptionTiersResponse>;
export type VlmActiveSubscriptionResponse = VlmResponse<UserActiveSubscriptionResponse>;
export type VlmNextPaymentResponse = VlmResponse<NextPaymentDateResponse>;
export type VlmUserProfile = VlmResponse<{ profile: UserProfileResponse }>;
