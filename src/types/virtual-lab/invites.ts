import { VlmResponse } from './common';

export const InviteOriginDict = {
  Lab: 'Lab',
  Project: 'Project',
} as const;
export type InviteOrigin = (typeof InviteOriginDict)[keyof typeof InviteOriginDict];

export type InviteData = {
  virtual_lab_id: string;
  project_id?: string;
  origin: InviteOrigin;
  status?: string;
};

export type AcceptInviteResponse = VlmResponse<InviteData>;

export type InvitationContent = {
  accepted: Boolean;
  invite_id: string;
  inviter_full_name: string;
} & (
  | {
      virtual_lab_id: string;
      virtual_lab_name?: string;
      origin: 'Lab';
    }
  | {
      origin: 'Project';
      project_id: string;
      project_name: string;
    }
);

export type InvitationContentResponse = VlmResponse<InvitationContent>;

export enum InviteErrorCodes {
  UNAUTHORIZED = 1,
  INVALID_LINK = 2,
  TOKEN_EXPIRED = 3,
  INVITE_ALREADY_ACCEPTED = 4,
  UNKNOWN = 5,
  DATA_CONFLICT = 6,
}
