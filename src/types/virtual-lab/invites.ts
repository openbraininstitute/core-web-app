import { VlmResponse } from './common';

type InviteOrigin = 'Lab' | 'Project';

export type InviteData = {
  virtual_lab_id: string;
  project_id?: string;
  origin: InviteOrigin;
  status?: string;
};

export type AcceptInviteResponse = VlmResponse<InviteData>;

export type InviteDetailsData = {
  accepted: Boolean;
  invite_id: string;
  inviter_full_name: string;
  origin: InviteOrigin;
  project_id?: string;
  project_name?: string;
  virtual_lab_id: string;
  virtual_lab_name?: string;
};

export type InviteDetailsResponse = VlmResponse<InviteDetailsData>;

export enum InviteErrorCodes {
  UNAUTHORIZED = 1,
  INVALID_LINK = 2,
  TOKEN_EXPIRED = 3,
  INVITE_ALREADY_ACCEPTED = 4,
  UNKNOWN = 5,
  DATA_CONFLICT = 6,
}
