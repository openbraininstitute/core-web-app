import { VlmResponse } from '@/types/virtual-lab/common';

type Meta = {
  total_items: number;
  total_pages: number;
  page: number;
  page_size: number;
};

type Links = {
  self: string;
  first: string;
  last: string;
  next: string;
  prev: string;
};

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

export enum ServiceType {
  Oneshot = 'oneshot',
  Longrun = 'longrun',
}

export enum ServiceSubtype {
  Storage = 'storage',
  SingleCellSim = 'single-cell-sim',
  SingleCellBuild = 'single-cell-build',
  SynaptomeSim = 'synaptome-sim',
  SynaptomeBuild = 'synaptome-build',
  MlRetrieval = 'ml-retrieval',
  MlLlm = 'ml-llm',
  MlRag = 'ml-rag',
  Notebook = 'notebook',
  SmallCircuitSim = 'small-circuit-sim',
  // { CircuitScale simulations
  SingleCellSimulation = 'single-sim',
  PairCellSimulation = 'pair-sim',
  SmallMicrocircuitSimulation = 'small-sim',
  MicrocircuitSimulation = 'microcircuit-sim',
  RegionSimulation = 'region-sim',
  SystemSimulation = 'system-sim',
  WholeBrainSimulation = 'whole-brain-sim',
  // } CircuitScale simulations
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

type VirtualLabJobReports = {
  items: JobReport[];
  meta: Meta;
  links: Links;
};

export type VirtualLabJobReportsResponse = VlmResponse<VirtualLabJobReports>;

type ProjectJobReports = {
  items: JobReport[];
  meta: Meta;
  links: Links;
};

export type ProjectJobReportsResponse = VlmResponse<ProjectJobReports>;

export type OneshotReservation = {
  virtualLabId: string;
  projectId: string;
  userId: string;
  type: ServiceType;
  subtype: ServiceSubtype;
  count: number;
};

export type OneshotReservationResponse = VlmResponse<{
  jobId: string;
  amount: string;
}>;

export type OneshotUsage = {
  virtualLabId: string;
  projectId: string;
  type: ServiceType;
  subtype: ServiceSubtype;
  count: number;
  jobId: string;
  timestamp: number;
};
