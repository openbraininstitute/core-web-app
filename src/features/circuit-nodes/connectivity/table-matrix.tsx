'use client';

import { atom, useAtom } from 'jotai';
import { useEffect, useState } from 'react';

import { NodesViewSelect } from '@/features/circuit-nodes/components/nodes-toolbar';
import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';
import { connectsItself } from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';
import {
  connectivityAsset,
  useConnectivityEntries,
} from '@/features/circuit-nodes/connectivity/use-connectivity';

import type { ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TablePathway } from '@/features/circuit-nodes/circuit-nodes-table';
import type { NodeColumns } from '@/features/circuit-nodes/connectivity/connectivity-view';
import type { MatrixPin } from '@/features/circuit-nodes/connectivity/use-matrix-pin';
import type { ViewMode } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

/** What a scene beside a report's table takes from its matrix: the pathway under the pointer. */
export type SceneMatrix = { pathway: TablePathway | null };

/**
 * What a report's table shows, kept with its circuit: the next report or simulation over the
 * same cells stays on it, as their ticks and filters do.
 */
const viewAtom = atom<{ circuitId: string; view: ViewMode } | undefined>(undefined);

export type TableMatrixView = {
  /** The matrix is up, in the rows' place. */
  on: boolean;
  /** Nodes or Connectivity: for the start of the header over the rows. */
  menu: ReactNode;
};

/** Whether a report's table shows its rows or the circuit's connectivity matrix, by a menu. */
export function useTableMatrixView(circuit: ICircuit): TableMatrixView {
  const [stored, setStored] = useAtom(viewAtom);
  const available = connectivityAsset(circuit) !== undefined;
  const view = available && stored?.circuitId === circuit.id ? stored.view : 'nodes';
  return {
    on: view === 'connectivity',
    menu: (
      <NodesViewSelect
        view={view}
        onViewChange={(next) => setStored({ circuitId: circuit.id, view: next })}
        connectivity={available}
      />
    ),
  };
}

type MatrixProps = {
  circuit: ICircuit;
  /** The table's node population, and how many neurons it has. */
  population: string;
  rowCount: number;
  /** The neurons on show, which the matrix keeps to: null for every one, undefined until known. */
  cells: Uint32Array | null | undefined;
  nodeColumns: NodeColumns | undefined;
  /** Clears what narrows the table, for the way back to every neuron. */
  onReset: () => void;
  /** Told of the matrix for a scene beside the table: undefined while it is not up. */
  onMatrixChange?: (matrix: SceneMatrix | undefined) => void;
  /** A square clicked filters the table to its pathway. */
  pin: MatrixPin;
  /** Kept at the start of the header, as over the rows. */
  headerStart?: ReactNode;
};

/**
 * A report's table, or the circuit's connectivity matrix in its place. The table stays as it
 * stands underneath, out of sight, rather than leaving: it still works out the cells on show,
 * and a reset from the scene still goes through it.
 */
export function TableOrMatrix({
  view,
  children,
  ...matrix
}: MatrixProps & { view: TableMatrixView; children: ReactNode }) {
  const { onMatrixChange } = matrix;
  useEffect(() => {
    if (!view.on) return;
    onMatrixChange?.({ pathway: null });
    return () => onMatrixChange?.(undefined);
  }, [view.on, onMatrixChange]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className={view.on ? 'invisible absolute inset-0 flex flex-col' : 'contents'}>
        {children}
      </div>
      {view.on && <TableMatrix {...matrix} menu={view.menu} />}
    </div>
  );
}

function TableMatrix({
  circuit,
  population,
  rowCount,
  cells,
  nodeColumns,
  onReset,
  onMatrixChange,
  pin,
  headerStart,
  menu,
}: MatrixProps & { menu: ReactNode }) {
  const { asset, entries, isLoading, error } = useConnectivityEntries(circuit, true);
  const [chosen, setChosen] = useState<string>();
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  const entry =
    entries?.find((e) => e.population === chosen) ??
    // At first, the one the table's selection and the scene's cells are of, where it says so.
    entries?.find((e) => connectsItself(e.population, population)) ??
    entries?.[0];

  return (
    <>
      <div className={styles.gridHeader}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {menu}
          {headerStart}
          {entries && entries.length > 1 && (
            <>
              <span className={styles.toolbarLabel}>Matrix</span>
              <PopulationSelect
                populations={entries.map((e) => ({ name: e.population }))}
                value={entry?.population}
                onChange={setChosen}
              />
            </>
          )}
        </div>
        <div ref={setHeaderSlot} className="ml-auto flex shrink-0 items-center gap-2" />
      </div>
      <ConnectivityView
        circuitId={circuit.id}
        assetId={asset?.id}
        entry={entry}
        listing={{ isLoading, error, empty: entries?.length === 0 }}
        selection={{ cells, population, rowCount, onReset }}
        nodeColumns={nodeColumns}
        onPathwayChange={
          onMatrixChange &&
          ((pathway) =>
            onMatrixChange({
              pathway: pathway && { circuitId: circuit.id, population, rowCount, ...pathway },
            }))
        }
        pin={pin}
        headerSlot={headerSlot}
      />
    </>
  );
}
