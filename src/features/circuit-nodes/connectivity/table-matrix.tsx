'use client';

import { useSetAtom } from 'jotai';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import {
  KeptGridSlot,
  KeptNodesGridPlaceholder,
} from '@/features/circuit-nodes/components/kept-nodes-grid';
import { NodesViewSelect } from '@/features/circuit-nodes/components/nodes-toolbar';
import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';
import { connectsItself } from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { ConnectivityView } from '@/features/circuit-nodes/connectivity/connectivity-view';
import {
  reportTableViewAtom,
  useReportTableView,
} from '@/features/circuit-nodes/connectivity/report-table-view';
import {
  connectivityAsset,
  useConnectivityEntries,
} from '@/features/circuit-nodes/connectivity/use-connectivity';
import { tablePaneTitle } from '@/features/circuit-nodes/types';

import type { ReactNode } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TablePathway } from '@/features/circuit-nodes/circuit-nodes-table';
import type { NodeColumns } from '@/features/circuit-nodes/connectivity/connectivity-view';
import type { MatrixPin } from '@/features/circuit-nodes/connectivity/use-matrix-pin';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

/** What a scene beside a report's table takes from its matrix: the pathway under the pointer. */
export type SceneMatrix = { pathway: TablePathway | null };

export type TableMatrixView = {
  /** The matrix is up, in the rows' place. */
  on: boolean;
  /** Nodes or Connectivity: for the start of the header over the rows. */
  menu: ReactNode;
};

/** Whether a report's table shows its rows or the circuit's connectivity matrix, by a menu. */
export function useTableMatrixView(circuit: ICircuit): TableMatrixView {
  const setStored = useSetAtom(reportTableViewAtom);
  const available = connectivityAsset(circuit) !== undefined;
  const view = useReportTableView(circuit);
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

type KeptMatrixProps = MatrixProps & { menu: ReactNode };

type MatrixKeeper = {
  /** The box the kept matrix is drawn in, moved into whichever view gives it room. */
  node: HTMLDivElement;
  /** The nodes session the kept matrix is over, while it is up. */
  session: string | null;
  show: (session: string, props: KeptMatrixProps) => void;
  drop: () => void;
};

const MatrixKeeperContext = createContext<MatrixKeeper | null>(null);

/**
 * One connectivity matrix for the report views under it, kept mounted while they come and go,
 * as `NodesTableKeeper` keeps their nodes table: its grouping and zoom stay as they were.
 */
export function TableMatrixKeeper({ children }: { children: ReactNode }) {
  // Made on the client: the server has no document to make it in.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = document.createElement('div');
    box.className = 'flex h-full min-h-0 flex-col';
    setNode(box);
  }, []);
  const [shown, setShown] = useState<{
    session: string;
    props: KeptMatrixProps;
    /** The cells last given, which `props` may hold an equal array in place of. */
    given: KeptMatrixProps['cells'];
  } | null>(null);
  const show = useCallback(
    (session: string, props: KeptMatrixProps) =>
      setShown((kept) => {
        if (kept?.session !== session) return { session, props, given: props.cells };
        // The next report's filter gives the same cells anew: the matrix groups by the array.
        const same = props.cells === kept.given || sameCells(props.cells, kept.props.cells);
        return {
          session,
          props: same ? { ...props, cells: kept.props.cells } : props,
          given: props.cells,
        };
      }),
    []
  );
  const drop = useCallback(() => setShown(null), []);
  const on = useReportTableView(shown?.props.circuit) === 'connectivity';
  const session = on && shown ? shown.session : null;
  const keeper = useMemo(
    () => (node ? { node, session, show, drop } : null),
    [node, session, show, drop]
  );
  return (
    <MatrixKeeperContext.Provider value={keeper}>
      {children}
      {node &&
        shown &&
        on &&
        createPortal(<TableMatrix key={shown.session} {...shown.props} />, node)}
    </MatrixKeeperContext.Provider>
  );
}

function sameCells(a: Uint32Array | null | undefined, b: Uint32Array | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Where a report view's table goes while it is not ready: the kept matrix while that is up,
 * over `session` where it is given, else the kept nodes grid, else `fallback`.
 */
export function KeptTablePlaceholder({
  session,
  fallback,
}: {
  session?: string;
  fallback: ReactNode;
}) {
  const keeper = useContext(MatrixKeeperContext);
  if (keeper?.session && (session === undefined || keeper.session === session)) {
    return <KeptGridSlot node={keeper.node} />;
  }
  return <KeptNodesGridPlaceholder session={session} fallback={fallback} />;
}

/** The title of a loading view's table pane. */
export function useKeptTableTitle(): string {
  const keeper = useContext(MatrixKeeperContext);
  return tablePaneTitle(keeper?.session ? 'connectivity' : 'nodes');
}

/**
 * A report's table, or the circuit's connectivity matrix in its place. The table stays as it
 * stands underneath, out of sight, rather than leaving: it still works out the cells on show,
 * and a reset from the scene still goes through it. The matrix is kept by a `TableMatrixKeeper`
 * where there is one.
 */
export function TableOrMatrix({
  view,
  session,
  children,
  ...matrix
}: MatrixProps & {
  view: TableMatrixView;
  /** The nodes session the table reads, which a kept matrix is kept with. */
  session: string;
  children: ReactNode;
}) {
  const { onMatrixChange } = matrix;
  useEffect(() => {
    if (!view.on) return;
    onMatrixChange?.({ pathway: null });
    return () => onMatrixChange?.(undefined);
  }, [view.on, onMatrixChange]);

  const keeper = useContext(MatrixKeeperContext);
  // Before paint, so the kept matrix takes the props in the frame that shows it. Over the same
  // cells it keeps the last view's until this one knows its cells and columns: before, it would
  // group over every neuron.
  const ready = matrix.cells !== undefined && matrix.nodeColumns !== undefined;
  useLayoutEffect(() => {
    if (!view.on) keeper?.drop();
    else if (ready || keeper?.session !== session) {
      keeper?.show(session, { ...matrix, menu: view.menu });
    }
  });

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className={view.on ? 'invisible absolute inset-0 flex flex-col' : 'contents'}>
        {children}
      </div>
      {view.on &&
        (keeper ? (
          <KeptGridSlot node={keeper.node} />
        ) : (
          <TableMatrix {...matrix} menu={view.menu} />
        ))}
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
}: KeptMatrixProps) {
  const { asset, entries, isLoading, error } = useConnectivityEntries(circuit, true);
  const [chosen, setChosen] = useState<string>();
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  const entry =
    entries?.find((e) => e.population === chosen) ??
    // At first, the one the table's selection and the scene's cells are of, where it says so.
    entries?.find((e) => connectsItself(e.population, population)) ??
    entries?.[0];

  return (
    <div className="flex h-full min-h-0 flex-col">
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
    </div>
  );
}
