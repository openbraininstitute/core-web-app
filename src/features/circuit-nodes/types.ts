import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

export const ColumnKindDict = {
  Numeric: 'numeric',
  Categorical: 'categorical',
  String: 'string',
  SyntheticNodeId: 'synthetic-node-id',
} as const;

export type ColumnKind = (typeof ColumnKindDict)[keyof typeof ColumnKindDict];

export const POSITION_COLUMNS = ['x', 'y', 'z'] as const;

/** What a menu lists a node's own properties under, its neuron sets among them. */
export const NEURON_HEADING = 'Neuron';

export type ColumnMeta = {
  name: string;
  kind: ColumnKind;
  dtype?: string;
  library?: string[];
  /** What a header calls it, for a column a host added; the file's go by their names. */
  label?: string;
  /** What a menu lists it under, where it is no neuron's property, such as a compartment's. */
  heading?: string;
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
  /** As typed, since a number would round a 64-bit id. */
  filter: string;
  filterTo?: string;
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
 * A whole column in node-index order, in the compact form the worker already
 * holds it: a typed array for numeric columns (the synthetic node id is an
 * identity `Uint32Array`), and the `@library` strings plus one library index
 * per node for categorical ones. Only string columns cost a JS value per node.
 *
 * The arrays are fresh copies, so the worker can transfer them across the
 * boundary instead of structured-cloning per-node values.
 */
export type ColumnValues =
  | { kind: 'numeric'; values: Float32Array | Float64Array | Uint32Array }
  | { kind: 'categorical'; library: string[]; indices: Uint32Array }
  | { kind: 'string'; values: string[] };

/**
 * A per-node column computed outside the node file, in node-index order: a
 * number per node, such as a simulation's spike statistics, `NaN` where a node
 * has none; or, given a library, an index into it per node, such as whether a
 * node is in one of the simulation's neuron sets. The second pages, sorts and
 * filters like a categorical column of the file's own.
 */
export type DerivedColumn =
  | { name: string; values: Float64Array }
  | { name: string; library: string[]; indices: Uint32Array };

/**
 * Everything a 3D viewer needs from a node population, in one read.
 *
 * Flat typed arrays rather than per-node objects: they cross the worker
 * boundary as transferables, so a population of any size costs one detach
 * instead of a structured clone. `Float32Array` is enough for every reader,
 * including electrode placement: micron coordinates spanning ~10⁴ µm keep
 * ~10⁻³ µm of resolution in f32, at half the memory and transfer of f64.
 */
export type NodeGeometry = {
  count: number;
  /** flat `[x, y, z, ...]`, one triple per node, in file order */
  positions: Float32Array;
  /** flat `[x, y, z, w, ...]` quaternions; null when the population declares none */
  orientations: Float32Array | null;
  /**
   * Morphology name per node; null when not requested (see
   * {@link NodeGeometryOptions.withMorphologies}), when the population has no
   * `morphology` column, or when `usePopulationsPlacement` skipped it for a
   * `virtual` population, which is drawn as somas and has no use for it.
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
   * `count * 4` `Float32Array`, which is 64 MB on a four-million-node circuit
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
  /**
   * The `circuit_config.json` as served, manifest variables unresolved.
   *
   * Kept alongside the parsed populations because morphology lookup needs
   * fields this shape does not carry (`components`, `alternate_morphologies`),
   * and re-downloading the config to read them would be a second request for
   * bytes already in hand.
   */
  raw: ICircuitSonataConfiguration;
};

export type ViewMode = 'nodes' | 'connectivity' | 'edges';

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
