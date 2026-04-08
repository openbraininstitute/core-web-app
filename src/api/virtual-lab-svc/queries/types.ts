import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TUserRole } from '../validation';

interface VlmResponse<T> {
  message: string;
  data: T | null;
}

export type TRole = TUserRole;
export type Member = {
  id: string;
  username: string;
  created_at: string;
  first_name: string;
  last_name: string;
  invite_accepted: boolean;
  role: TRole;
  name: string;
  email: string;
};

export type MembersResponse = VlmResponse<{
  owner_id: string;
  users: Array<Member>;
  total_active: number;
  total: number;
}>;
export type MemberResponse = VlmResponse<{
  user: Member;
}>;

export type Project = {
  id: string;
  nexus_project_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  virtual_lab_id: string;
  user_count?: number;
};

type ProjectsResponse = {
  results: Array<Project>;
  page: number;
  size: number;
  page_size: number;
  total: number;
};

type ProjectResponse = {
  data: Project;
};

export type ProjectCreationResponse = VlmResponse<{
  project: Project;
  balance_added: boolean;
}>;

export type Course = {
  template_project_id: string;
  is_initialized: boolean;
};

export type TVirtualLab = {
  id: string;
  name: string;
  description: string;
  reference_email: string;
  email_verified: boolean;
  entity: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  members_count: number | null;
  projects_count: number | null;
  created_by: string | null;
  compute_cell: string;
  course: Course | null;
};

export type TVirtualLabExistsVerificationResponse = VlmResponse<{
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

export type VirtualLabResponseData = {
  virtual_lab: TVirtualLab;
  admins: Array<string> | null;
};

export type TVirtualLabResponse = VlmResponse<VirtualLabResponseData>;

type VerificationCodeEmailResponseData = {
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

type PriceOption = {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  nickname?: string;
};

type SubscriptionTier = {
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

export type TVirtualLabListResponse = VlmResponse<{
  pending_labs: Array<TVirtualLab & { invite_id: string }>;
  virtual_lab: TVirtualLab;
  membership_labs: {
    total: number;
    filtered_total: number;
    page: number;
    size: number;
    page_size: number;
    results: Array<TVirtualLab>;
    has_next: boolean;
    has_previous: boolean;
  };
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
    tier: 'FREE' | 'PRO' | 'PREMIUM';
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

type UserSubscriptionHistory = {
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

type UserProfile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
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

type ProjectStats = {
  project_id: string;
  total_stars: number;
  total_bookmarks: number;
  total_pending_invites: number;
  total_members: number;
  total_notebooks: number;
  admin_users: Array<string>;
  member_users: Array<string>;
};

type VirtualLabStats = {
  virtual_lab_id: string;
  total_projects: number;
  total_members: number;
  total_pending_invites: number;
  admin_users: Array<string>;
  member_users: Array<string>;
};

type DeleteProjectMember = {
  project_id: string;
  deleted: string;
  deleted_at: string;
};

export type UserGroup = {
  group_id: string;
  name: string;
  group_type: 'vlab' | 'project';
  project_id?: string;
  virtual_lab_id?: string;
  role: TRole;
};

type UserStats = {
  owned_labs_count: number;
  member_labs_count: number;
  pending_invites_count: number;
  owned_projects_count: number;
  member_projects_count: number;
  total_labs: number;
  total_projects: number;
};

type AttachUsersToProject = {
  project_id: string;
  added_users: Array<{
    id: string;
    email: string;
    role: TRole;
  }>;
  updated_users: Array<{
    id: string;
    email: string;
    role: TRole;
  }>;
  failed_operations: Array<{
    user_id: string;
    requested_role: TRole;
    error: string;
  }>;
  email_sending_failures: Array<{
    email: string;
    error: string;
  }>;
  processed_at: Date;
};

interface UserGroupsResponse {
  groups: Array<UserGroup>;
}

export type BookmarkRequest = {
  entity_id: string;
  category: TExtendedEntitiesTypeDict;
};

export type DeleteBookmarksResponse = {
  successfully_deleted: Array<BookmarkRequest>;
  failed_to_delete: Array<BookmarkRequest>;
};

export interface AddBookmarkResponse extends BookmarkRequest {
  id: string;
}

export interface LibraryBookmark extends AddBookmarkResponse {}

type BookmarksByCategoryResponse = Record<TExtendedEntitiesTypeDict, Array<LibraryBookmark>>;
export type ProjectBookmarksCategories = Record<TEntityTypeDict, number>;

export type RecentWorkspace = {
  recent_workspace: {
    user_id: string;
    workspace: {
      virtual_lab_id: string;
      project_id: string;
    };
    updated_at: Date;
    virtual_lab: TVirtualLab;
    project: Project;
  };
};

enum PromotionCodeUsageStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export type RedeemPromotionCodeRequest = {
  code: string;
  virtual_lab_id: string;
};

export type RedemptionResult = {
  redemption_id: string;
  promotion_code: string;
  credits_granted: number;
  virtual_lab_id: string;
  status: PromotionCodeUsageStatus;
  redeemed_at: Date;
  accounting_transaction_id: string | null;
};

export type VlmGetSubscriptionResponse = VlmResponse<GetSubscriptionResponse>;
export type VlmCreateSubscriptionResponse = VlmResponse<CreateSubscriptionResponse>;
export type VlmCancelSubscriptionResponse = VlmResponse<CancelSubscriptionResponse>;
export type VlmSubscriptionStatusResponse = VlmResponse<SubscriptionStatusResponse>;
export type VlmUserSubscriptionsResponse = VlmResponse<UserSubscriptionsResponse>;
export type VlmListSubscriptionResponse = VlmResponse<Array<SubscriptionDetails>>;
export type VlmListSubscriptionTiersResponse = VlmResponse<SubscriptionTiersResponse>;
export type VlmActiveSubscriptionResponse = VlmResponse<UserActiveSubscriptionResponse>;
export type VlmNextPaymentResponse = VlmResponse<NextPaymentDateResponse>;
export type VlmUserProfile = VlmResponse<{ profile: UserProfileResponse }>;
export type VlmProjectsResponse = VlmResponse<ProjectsResponse>;
export type VlmProjectResponse = VlmResponse<ProjectResponse>;
export type VlmProjectStatsResponse = VlmResponse<ProjectStats>;
export type VlmVirtualLabStatsResponse = VlmResponse<VirtualLabStats>;
export type VlmDeleteProjectMemberResponse = VlmResponse<DeleteProjectMember>;
export type VlmUserGroupsResponse = VlmResponse<UserGroupsResponse>;
export type VlmUserStatsResponse = VlmResponse<UserStats>;
export type VlmAttachUsersToProjectResponse = VlmResponse<AttachUsersToProject>;
export type VlmGetProjectBookmarksResponse = VlmResponse<BookmarksByCategoryResponse>;
export type VlmGetProjectLibraryCategories = VlmResponse<ProjectBookmarksCategories>;
export type VlmGetProjectLibraryPerCategory = VlmResponse<{
  results: Array<LibraryBookmark>;
  page: number;
  page_size: number;
  total: number;
}>;

export type VlmRecentWorkspace = VlmResponse<RecentWorkspace>;
export type VlmPromotionResponse = VlmResponse<RedemptionResult>;

export const OnboardingFeature = {
  WorkspaceData: 'workspace-data',
  WorkspaceProject: 'workspace-project',
  WorkspaceWorkflow: 'workspace-workflow',
} as const;

export type TOnboardingFeature = (typeof OnboardingFeature)[keyof typeof OnboardingFeature];

export type OnboardingStatus = {
  completed: boolean;
  completed_at: string | null;
  current_step: number | null;
  dismissed: boolean;
};

export type OnboardingUpdateRequest = {
  completed?: boolean | null;
  current_step?: number | null;
  dismissed?: boolean | null;
};

export type VlmOnboardingResponse = VlmResponse<{
  [key: string]: OnboardingStatus;
}>;
