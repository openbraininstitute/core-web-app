import type { TVirtualLab } from '@/api/virtual-lab-svc/queries/types';
import type { VlmResponse } from './common';

/** `GET .../projects/:id` — allowed `expand` query values. */
export type ProjectExpandParam = 'admin' | 'virtual_lab';

/** Body of `VliAppResponse` for single-project detail (`ProjectDetailOut`). */
export type ProjectDetailOut = {
  id: string;
  name: string;
  description: string | null;
  contact_email?: string | null;
  created_at: string;
  updated_at: string | null;
  virtual_lab_id: string;
  nexus_project_id?: string;
  budget?: number;
  user_count?: number;
  /** Present when `expand` includes `admin`. */
  admin?: string[];
  /** Present when `expand` includes `virtual_lab`. */
  virtual_lab?: TVirtualLab;
};

export type ProjectDetailResponse = VlmResponse<ProjectDetailOut>;

export type ProjectResponse = VlmResponse<{ project: Project }>;

export type Project = {
  id: string;
  nexus_project_id: string;
  name: string;
  description: string;
  budget: number;
  created_at: string;
  updated_at: string;
  virtual_lab_id: string;
  user_count?: number;
  admins?: Array<string>;
};
