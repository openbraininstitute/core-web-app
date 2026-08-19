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

/**
 * Everything a 3D viewer needs from a node population, in one read.
 *
 * Flat typed arrays rather than per-node objects: they cross the worker
 * boundary as transferables, so a population of any size costs one detach
 * instead of a structured clone. `Float64Array` and not `Float32Array` because
 * these coordinates feed electrode placement maths, not just the paint.
 */
export type NodeGeometry = {
  count: number;
  /** flat `[x, y, z, ...]`, one triple per node, in file order */
  positions: Float64Array;
  /** flat `[x, y, z, w, ...]` quaternions; null when the population declares none */
  orientations: Float64Array | null;
  /**
   * Morphology name per node; null when not requested (see
   * {@link NodeGeometryOptions.withMorphologies}) or when the population has no
   * `morphology` column.
   */
  morphologies: string[] | null;
};

export type NodeGeometryOptions = {
  /**
   * Read the `morphology` column too. Off by default, because it is the one
   * part of {@link NodeGeometry} that cannot cross the worker boundary as a
   * transferable: it decodes to one JS string per node, which at region scale
   * is the single largest allocation in the payload.
   *
   * Only callers that resolve a morphology *file* from the name need it; the
   * somas-only viewer does not.
   */
  withMorphologies?: boolean;
  /**
   * Read the four `orientation_*` columns too. Off by default: they pack into a
   * `count * 4` `Float64Array`, which is 128 MB on a four-million-node circuit
   * and is packed, transferred and dropped again by any viewer that only places
   * somas.
   *
   * Only callers that turn a morphology into world space need them.
   */
  withOrientations?: boolean;
};

export type { DownloadProgress } from '@/utils/h5/fs';

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
