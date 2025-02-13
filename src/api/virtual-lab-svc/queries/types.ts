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
  exists: boolean;
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
