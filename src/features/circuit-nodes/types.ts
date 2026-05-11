export type ColumnKind = 'numeric' | 'categorical' | 'string';

export type ColumnMeta = {
  name: string;
  kind: ColumnKind;
  dtype?: string;
  library?: string[];
};

export type SortItem = {
  column: string;
  direction: 'asc' | 'desc';
};

export type TextFilter = {
  filterType: 'text';
  type: 'contains' | 'equals' | 'notEqual' | 'startsWith' | 'endsWith';
  filter: string;
};

export type NumberFilter = {
  filterType: 'number';
  type:
    | 'equals'
    | 'notEqual'
    | 'lessThan'
    | 'lessThanOrEqual'
    | 'greaterThan'
    | 'greaterThanOrEqual'
    | 'inRange';
  filter: number;
  filterTo?: number;
};

export type FilterModel = Record<string, TextFilter | NumberFilter>;

export type GetRowsRequest = {
  start: number;
  end: number;
  sort?: SortItem[];
  filter?: FilterModel;
  columns: string[];
};

export type GetRowsResponse = {
  rows: Record<string, string | number>[];
  total: number;
};

export type OpenRequest = {
  populationKey: string;
  fileKey: string;
  url: string;
  headers: Record<string, string>;
};

export type OpenResponse = {
  rowCount: number;
  columns: ColumnMeta[];
};

export type NodePopulation = {
  name: string;
  type: string;
  file: string;
};

export type EdgePopulation = {
  name: string;
  type: string;
  file: string;
};

export type ParsedCircuitConfig = {
  nodes: NodePopulation[];
  edges: EdgePopulation[];
  circuitAssetId: string;
};

export type ViewMode = 'nodes' | 'edges';
export type DisplayMode = 'collapsed' | 'half' | 'full';

export const CIRCUIT_H5_CACHE = 'obi-circuit-h5-v1';

export const DEFAULT_VISIBLE_COLUMNS: ReadonlySet<string> = new Set([
  'node_id',
  'mtype',
  'etype',
  'region',
  'morph_class',
  'synapse_class',
  'layer',
  'morphology',
  'x',
  'y',
  'z',
]);
