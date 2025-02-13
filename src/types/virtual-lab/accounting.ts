import { VlmResponse } from './common';

/* ---------------------------------------- Common types ---------------------------------------- */

export type Meta = {
  total_items: number;
  total_pages: number;
  page: number;
  page_size: number;
};

export type Links = {
  self: string;
  first: string;
  last: string;
  next: string;
  prev: string;
};

/* ---------------------------------------- Balance types --------------------------------------- */

export type ProjectBalance = {
  proj_id: string;
  balance: string;
  reservation: string;
};

export type ProjectBalanceResponse = VlmResponse<ProjectBalance>;

type VirtualLabBalance = {
  vlab_id: string;
  balance: string;
  projects?: ProjectBalance[];
};

export type VirtualLabBalanceResponse = VlmResponse<VirtualLabBalance>;

/* -------------------------------------- Job report types -------------------------------------- */

export enum ServiceType {
  Oneshot = 'oneshot',
  Longrun = 'longrun',
}

export enum ServiceSubtype {
  Storage = 'storage',
  SingleCellSim = 'single-cell-sim',
  MlRetrieval = 'ml-retrieval',
  MlLlm = 'ml-llm',
  MlRag = 'ml-rag',
}

export type JobReport = {
  job_id: string;
  group_id: string;
  proj_id: string;
  user_id: string;
  vlab_id: string;
  type: ServiceType;
  subtype: ServiceSubtype;
  reserved_at: string;
  started_at: string;
  amount: string;
  count: number;
  reserved_amount: string;
  reserved_count: number;
};

export type VirtualLabJobReports = {
  items: JobReport[];
  meta: Meta;
  links: Links;
};

export type VirtualLabJobReportsResponse = VlmResponse<VirtualLabJobReports>;

export type ProjectJobReports = {
  items: JobReport[];
  meta: Meta;
  links: Links;
};

export type ProjectJobReportsResponse = VlmResponse<ProjectJobReports>;
