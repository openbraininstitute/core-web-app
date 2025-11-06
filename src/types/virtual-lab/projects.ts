import { VlmResponse } from './common';

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
