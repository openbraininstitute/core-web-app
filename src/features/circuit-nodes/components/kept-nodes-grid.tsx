'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';

import type { ComponentProps, ReactNode } from 'react';

/** A view's grid: everything but the columns on show, which the grid keeps across views. */
type GridProps = Omit<
  ComponentProps<typeof NodesGrid>,
  'visibleColumns' | 'onVisibleColumnsChange'
>;

type Keeper = {
  /** The box the kept grid is drawn in, moved into whichever view gives it room. */
  node: HTMLDivElement;
  /** The nodes session the kept grid reads, once a view has shown one. */
  session: string | null;
  show: (session: string, props: GridProps) => void;
};

const KeeperContext = createContext<Keeper | null>(null);

/**
 * One nodes table for the views under it, kept mounted while they come and go.
 * Each view shows its grid through it and gives it room, so the next view over
 * the same cells - another report, another simulation - takes the grid over as
 * it stands, its rows, scroll, sort and columns, rather than building one anew.
 * A view still loading can give it room too, so the table stays while the plot
 * above it is read.
 */
export function NodesTableKeeper({ children }: { children: ReactNode }) {
  // Made on the client: the server has no document to make it in.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = document.createElement('div');
    box.className = 'flex h-full min-h-0 flex-col';
    setNode(box);
  }, []);
  const [shown, setShown] = useState<{ session: string; props: GridProps } | null>(null);
  const show = useCallback((session: string, props: GridProps) => {
    setShown((previous) =>
      previous?.session === session && sameProps(previous.props, props)
        ? previous
        : { session, props }
    );
  }, []);
  const session = shown?.session ?? null;
  const keeper = useMemo(() => (node ? { node, session, show } : null), [node, session, show]);
  return (
    <KeeperContext.Provider value={keeper}>
      {children}
      {node &&
        shown &&
        createPortal(<GridWithColumns key={shown.session} {...shown.props} />, node)}
    </KeeperContext.Provider>
  );
}

/**
 * A view's nodes grid: shown through the page's keeper where there is one, and
 * drawn in place where there is not. `session` names the cells it reads.
 */
export function KeptNodesGrid({ session, ...props }: GridProps & { session: string }) {
  const keeper = useContext(KeeperContext);
  // Before paint, so the kept grid takes these props in the frame that shows it.
  useLayoutEffect(() => {
    keeper?.show(session, props);
  });
  if (!keeper) return <GridWithColumns {...props} />;
  return <KeptGridSlot node={keeper.node} />;
}

/**
 * Where a view's grid goes while it is not ready: the kept grid as it stands,
 * when it reads `session` (any session, when that is not known yet), else
 * `fallback`.
 */
export function KeptNodesGridPlaceholder({
  session,
  fallback,
}: {
  session?: string;
  fallback: ReactNode;
}) {
  const keeper = useContext(KeeperContext);
  if (!keeper?.session || (session !== undefined && keeper.session !== session)) return fallback;
  return <KeptGridSlot node={keeper.node} />;
}

/** The grid with the columns chosen on it: every one at first, and again when they change. */
function GridWithColumns(props: GridProps) {
  const { columns } = props;
  const names = columns.map((c) => c.name).join('\n');
  const [visible, setVisible] = useState(() => defaultVisibleColumnSet(columns));
  const [shownNames, setShownNames] = useState(names);
  if (shownNames !== names) {
    setShownNames(names);
    setVisible(defaultVisibleColumnSet(columns));
  }
  return <NodesGrid {...props} visibleColumns={visible} onVisibleColumnsChange={setVisible} />;
}

/** The grid's scroll offsets, kept while it is out of the page, which loses them. */
const scrolls = new WeakMap<HTMLElement, { top: number; left: number }>();
const VERTICAL = '.ag-body-viewport';
const HORIZONTAL = ['.ag-center-cols-viewport', '.ag-body-horizontal-scroll-viewport'];

/** Room for the kept grid: it is moved in here, not mounted anew. */
function KeptGridSlot({ node }: { node: HTMLDivElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const slot = ref.current;
    if (!slot) return;
    slot.appendChild(node);
    const scroll = scrolls.get(node);
    if (scroll) {
      const vertical = node.querySelector(VERTICAL);
      if (vertical) vertical.scrollTop = scroll.top;
      for (const selector of HORIZONTAL) {
        const horizontal = node.querySelector(selector);
        if (horizontal) horizontal.scrollLeft = scroll.left;
      }
    }
    return () => {
      scrolls.set(node, {
        top: node.querySelector(VERTICAL)?.scrollTop ?? 0,
        left: node.querySelector(HORIZONTAL[0])?.scrollLeft ?? 0,
      });
      // The next view's room may have taken it already.
      if (node.parentElement === slot) slot.removeChild(node);
    };
  }, [node]);
  return <div ref={ref} className="flex h-full min-h-0 flex-col" />;
}

function sameProps(a: GridProps, b: GridProps): boolean {
  const keys = Object.keys(a) as (keyof GridProps)[];
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]));
}
