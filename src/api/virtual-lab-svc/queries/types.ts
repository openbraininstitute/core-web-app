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
  plan_id: number;
  created_at: string; // ISO timestamp
  nexus_organization_id: string;
  updated_at: string; // ISO timestamp
  budget: number;
};

export type VirtualLabExistsVerificationResponse = VlmResponse<{
  exists: boolean;
}>;

export type ProjectExistsVerificationResponse = VlmResponse<{
  exist: boolean;
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
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  INCOMPLETE_EXPIRED = 'INCOMPLETE_EXPIRED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
  UNPAID = 'UNPAID'
}

export type PriceOption = {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  nickname?: string;
}

export type SubscriptionPlan = {
  id: string;
  name: string;
  description?: string;
  prices: PriceOption[];
  metadata: Record<string, string>;
}

export type SubscriptionDetails = {
  id: string;
  stripe_subscription_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  amount: number;
  currency: string;
  interval: string;
  auto_renew: boolean;
  cancel_at_period_end?: boolean;
  canceled_at?: string;
}

export type CreateSubscriptionRequest = {
  virtual_lab_id: string;
  price_id: string;
  payment_method_id: string;
  metadata?: Record<string, string>;
}

export type CancelSubscriptionRequest = {
  reason?: string;
}

export type SubscriptionResponse = {
  data: SubscriptionDetails;
}

export type SubscriptionPlansResponse = {
  data: Array<SubscriptionPlan>;
}

export type SubscriptionsListResponse = {
  data: Array<SubscriptionDetails>;
}