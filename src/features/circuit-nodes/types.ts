export const ColumnKindDict = {
  Numeric: 'numeric',
  Categorical: 'categorical',
  String: 'string',
  SyntheticNodeId: 'synthetic-node-id',
} as const;

export type ColumnKind = (typeof ColumnKindDict)[keyof typeof ColumnKindDict];

export type ColumnMeta = {
  name: string;
  kind: ColumnKind;
  dtype?: string;
  library?: string[];
};

export type SortDirection = 'asc' | 'desc';

export type SortItem = {
  column: string;
  direction: SortDirection;
};

export type TextFilterOp = 'contains' | 'equals' | 'notEqual' | 'startsWith' | 'endsWith';

export type TextFilter = {
  filterType: 'text';
  type: TextFilterOp;
  filter: string;
};

export type NumberFilterOp =
  | 'equals'
  | 'notEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'inRange';

export type NumberFilter = {
  filterType: 'number';
  type: NumberFilterOp;
  filter: number;
  filterTo?: number;
};

export type SetFilter = {
  filterType: 'set';
  values: string[];
};

export type FilterOperator = 'AND' | 'OR';

export type CombinedTextFilter = {
  filterType: 'text';
  operator: FilterOperator;
  conditions: TextFilter[];
};

export type CombinedNumberFilter = {
  filterType: 'number';
  operator: FilterOperator;
  conditions: NumberFilter[];
};

export type ColumnFilter =
  | TextFilter
  | NumberFilter
  | SetFilter
  | CombinedTextFilter
  | CombinedNumberFilter;

export type FilterModel = Record<string, ColumnFilter>;

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

/** Download progress reported from the worker's fetch loop. `total` is null when the response
 * carries no Content-Length. */
export type DownloadProgress = {
  received: number;
  total: number | null;
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

export const CIRCUIT_H5_CACHE = 'obi-circuit-h5-v1';

export type PreferredColumn = {
  name: string;
  width?: number;
};

export const PREFERRED_COLUMNS: readonly PreferredColumn[] = [
  { name: 'node_id', width: 80 },
  { name: 'region', width: 80 },
  { name: 'layer', width: 70 },
  { name: 'mtype', width: 90 },
  { name: 'etype', width: 80 },
  { name: 'morph_class', width: 110 },
  { name: 'synapse_class', width: 120 },
  { name: 'morphology', width: 180 },
  { name: 'me_combo', width: 160 },
  { name: 'x', width: 100 },
  { name: 'y', width: 100 },
  { name: 'z', width: 100 },
];
