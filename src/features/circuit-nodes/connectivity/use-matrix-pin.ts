import { atom, useAtom } from 'jotai';
import { useEffect } from 'react';

import { logError } from '@/utils/logger';

import type { MatrixPathway } from '@/features/circuit-nodes/connectivity/connectivity-view';
import type {
  ColumnFilter,
  ColumnMeta,
  DerivedColumn,
  FilterModel,
} from '@/features/circuit-nodes/types';

/** Its owner name in the shared nodes session. */
const OWNER = 'matrix-pathway';
const COLUMN = 'matrix:pathway';
/** What a neuron is to the pathway, by code: one flag for its start, another for its end. */
const ROLES = ['Outside', 'Presynaptic', 'Postsynaptic', 'Both'];
const IN_PATHWAY: ColumnFilter = { filterType: 'set', values: ROLES.slice(1) };
const PINNED_COLUMNS: ColumnMeta[] = [
  { name: COLUMN, kind: 'categorical', library: ROLES, label: 'Matrix pathway' },
];
const NO_COLUMNS: ColumnMeta[] = [];

/** A pathway clicked in a connectivity matrix, which the table and what is beside it keep to. */
export type PinnedPathway = MatrixPathway & {
  /** The square it was clicked in: the matrix as then asked for, and its row and column. */
  square: { matrix: string; pre: number; post: number };
  name: string;
  /** What the matrix was over, which it stays over: the pathway narrows what is beside it. */
  matrixCells: Uint32Array | null;
};

/** The pinned pathway, and the way to pin another or, given null, let it go. */
export type MatrixPin = {
  pinned: PinnedPathway | null;
  onPick: (next: PinnedPathway | null) => void;
};

function pathwayColumn({ pre, post }: MatrixPathway, rowCount: number): DerivedColumn {
  const indices = new Uint32Array(rowCount);
  for (const id of pre) if (id < rowCount) indices[id] |= 1;
  for (const id of post) if (id < rowCount) indices[id] |= 2;
  return { name: COLUMN, library: ROLES, indices };
}

/** Kept with its scope, like the filter it goes with, which may outlive the view. */
const pinAtom = atom<{ scope: string; pinned: PinnedPathway } | undefined>(undefined);

/**
 * A pathway pinned from a connectivity matrix, as a column of the nodes session telling each
 * neuron's part in it and a filter on that column. So the table lists, counts, resets and
 * downloads it as any other filter, and whatever follows the table's filter - the scene, a
 * raster, traces, statistics - follows it. Taking the filter off, however, lets the pathway go.
 */
export function useMatrixPin({
  scope,
  ready,
  rowCount,
  filterModel,
  setFilterModel,
  clearTicks,
  setDerivedColumns,
}: {
  /** Whose filter this is. */
  scope: string;
  /** Whether the session can be told of the column yet. */
  ready: boolean;
  rowCount: number;
  filterModel: FilterModel;
  setFilterModel: (model: FilterModel) => void;
  /** Ticks win over a filter beside the table, so a pathway clicked takes their place. */
  clearTicks?: () => void;
  setDerivedColumns: (owner: string, columns: DerivedColumn[]) => Promise<void>;
}) {
  const [stored, setStored] = useAtom(pinAtom);
  const pinned = stored?.scope === scope && filterModel[COLUMN] ? stored.pinned : null;

  // A session opened anew over the same cells, as for the next simulation, hears of it again,
  // and the filter's rows are asked for over it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once for each session
  useEffect(() => {
    if (!ready || !pinned) return;
    let cancelled = false;
    setDerivedColumns(OWNER, [pathwayColumn(pinned, rowCount)])
      .then(() => {
        if (!cancelled) setFilterModel({ ...filterModel });
      })
      // The session closed underneath; its next ready state tells it again.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ready, scope]);

  const onPick = (next: PinnedPathway | null) => {
    if (!next) {
      const { [COLUMN]: _pathway, ...rest } = filterModel;
      setFilterModel(rest);
      setStored(undefined);
      return;
    }
    setDerivedColumns(OWNER, [pathwayColumn(next, rowCount)])
      .then(() => {
        clearTicks?.();
        setStored({ scope, pinned: next });
        setFilterModel({ ...filterModel, [COLUMN]: IN_PATHWAY });
      })
      .catch((error: unknown) => logError('The table could not be filtered to a pathway:', error));
  };

  return {
    pinned,
    onPick,
    /** The column to list, while a pathway is pinned. */
    columns: pinned ? PINNED_COLUMNS : NO_COLUMNS,
    /** Says which pathway: for a grid that stays up, to take its filter on. */
    key: pinned ? `${pinned.square.matrix}/${pinned.square.pre}/${pinned.square.post}` : '',
  };
}
