'use client';

import { GlobalOutlined, PlusOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  PaneSideResizeHandle,
  SHUT_BAR_SIZE,
  ShutPaneBar,
} from '@/features/circuit-viewer/pane-resize-handle';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Button } from '@/ui/molecules/button';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { EntityPanelProvider, EntityPanelView, useEntityPanel } from './entity-panel';
import {
  useResearchLogHref,
  useResearchLogScope,
  useResearchLogs,
  useStartResearchLog,
} from './hooks';
import { LogActions } from './log-actions';

import type { ReactNode } from 'react';

/** The rail opens at this width (26rem at the app's 14px rem) and cannot be dragged wider. */
const RAIL_WIDTH = 364;
/** Dragged under this it holds there; dragged on to under half of it, the rail shuts. */
const RAIL_FLOOR = 220;
/**
 * The grid's padding plus half its gap, which is 1rem (p-2 and gap-4): the rule between rail and
 * page sits this far past the rail's edge. The app's rem is 14px, so it is read, not assumed.
 */
const ruleOffset = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 14;

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** A rail of pills on one white card, with the page beside it. */
export function ResearchLogsLayout({ children }: { children: ReactNode }) {
  return (
    <EntityPanelProvider>
      <Shell>{children}</Shell>
    </EntityPanelProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { logId } = useParams<{ logId?: string }>();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useResearchLogs(search);
  const href = useResearchLogHref();
  const { start, isPending } = useStartResearchLog();
  const panel = useEntityPanel();
  const panelOpen = !!panel?.record;
  const closePanel = panel?.close;
  // the rail's width, dragged from the grab bar between it and the page
  const gridRef = useRef<HTMLDivElement>(null);
  const [railWidth, setRailWidth] = useState(RAIL_WIDTH);
  const [railShut, setRailShut] = useState(false);
  const [dragging, setDragging] = useState(false);

  // an entity opened from one log has no business beside the next
  // biome-ignore lint/correctness/useExhaustiveDependencies: moving to another log is the trigger
  useEffect(() => {
    closePanel?.();
  }, [logId, closePanel]);

  return (
    <div
      data-testid="research-logs-layout"
      className="bg-background h-full w-full overflow-hidden pt-2 pr-1"
    >
      {/* as the Data page does: with an entity open, the rail makes way and the log shifts left */}
      <motion.div
        ref={gridRef}
        className="mx-2 mb-2 ml-3 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden p-2"
        initial={false}
        animate={{
          gridTemplateColumns: panelOpen
            ? '3fr 2fr'
            : railShut
              ? `${SHUT_BAR_SIZE}px 1fr`
              : `${railWidth}px 1fr`,
          gridTemplateAreas: panelOpen ? "'body mini-view'" : "'aside body'",
        }}
        // while the bar is dragged the columns follow the pointer, not a spring behind it
        transition={
          dragging ? { duration: 0 } : { type: 'spring', stiffness: 320, damping: 30, mass: 0.6 }
        }
        style={{ willChange: 'grid-template-columns, grid-template-areas' }}
      >
        <aside
          className={cn(
            BOX_CLASS,
            'flex h-full min-h-0 flex-col gap-3 overflow-hidden p-3 [grid-area:aside]',
            { hidden: panelOpen || railShut }
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-2">
            <ScopeToggles />
            <Button
              rounded
              variant="success"
              type="button"
              onClick={start}
              disabled={isPending}
              className="h-10 gap-2 border border-white/20 px-4 font-semibold"
            >
              New <PlusOutlined className="text-sm" />
            </Button>
          </div>

          <label className="text-primary-9 bg-neutral-1 flex h-10 shrink-0 items-center gap-2 rounded-full px-4">
            <SearchOutlined />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="placeholder:text-neutral-3 w-full bg-transparent outline-none"
            />
          </label>

          <nav className="secondary-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
            {isLoading ? (
              <Skeleton className="h-14 w-full rounded-full" />
            ) : data?.data.length === 0 ? (
              <p className="text-neutral-4 px-3 text-sm">
                {search ? 'No logs match.' : 'No research logs here.'}
              </p>
            ) : (
              data?.data.map((log) => {
                const active = log.id === logId;
                return (
                  <div key={log.id} className="group/log relative shrink-0">
                    <Button
                      asChild
                      rounded
                      variant="outline"
                      size="lg"
                      active={active}
                      className={cn(
                        'h-auto w-full border-none py-3 text-base',
                        !active && 'bg-neutral-1 shadow-none'
                      )}
                    >
                      <Link href={href(log.id)} className="flex! w-full flex-col items-start!">
                        <span className="w-full truncate text-left font-bold text-current">
                          {log.name}
                        </span>
                        <span
                          className={cn(
                            'w-full truncate text-left text-xs font-light',
                            active ? 'text-white' : 'text-neutral-4'
                          )}
                        >
                          {log.created_by?.pref_label ?? 'Unknown author'} ·{' '}
                          {dateLabel(log.update_date)}
                        </span>
                      </Link>
                    </Button>
                    <LogActions log={log} className="absolute top-1/2 right-3 -translate-y-1/2" />
                  </div>
                );
              })
            )}
          </nav>
        </aside>

        {railShut && !panelOpen && (
          <ShutPaneBar
            title="Reports"
            upright
            onOpen={() => setRailShut(false)}
            className="h-full [grid-area:aside]"
          />
        )}

        <main className="relative min-h-0 [grid-area:body]">
          {!panelOpen && (
            // the grab bar goes halfway across the gap between the two cards: this zero-width
            // anchor is that far (half the gap) left of the page, and the bar centres on it
            <div className="pointer-events-none absolute inset-y-0 -left-2 w-0 *:pointer-events-auto">
              <PaneSideResizeHandle
                containerRef={gridRef}
                minWidth={0}
                onResize={(left) => {
                  const wanted = left - ruleOffset();
                  if (wanted < RAIL_FLOOR / 2) {
                    setRailShut(true);
                    return;
                  }
                  setRailShut(false);
                  setRailWidth(Math.min(RAIL_WIDTH, Math.max(RAIL_FLOOR, wanted)));
                }}
                onDragChange={setDragging}
              />
            </div>
          )}
          {children}
        </main>

        <div
          data-testid="research-log-entity-panel"
          className={cn('h-full min-h-0 w-full min-w-0 [grid-area:mini-view]', {
            hidden: !panelOpen,
          })}
        >
          <EntityPanelView />
        </div>
      </motion.div>
    </div>
  );
}

/** The Data table's scope marks: green globe for public, light-blue people for the project. */
function ScopeToggles() {
  const { scope, toggle } = useResearchLogScope();
  const items = [
    { key: 'public', label: 'Public', Icon: GlobalOutlined, on: 'text-green-600 bg-green-50' },
    { key: 'project', label: 'Project', Icon: TeamOutlined, on: 'text-primary-4 bg-primary-1' },
  ] as const;
  return (
    <div className="bg-neutral-1 flex h-10 shrink-0 items-center gap-1 rounded-full px-1.5">
      {items.map(({ key, label, Icon, on }) => (
        <Tooltip key={key} delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-pressed={scope[key]}
              aria-label={label}
              onClick={() => toggle(key)}
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-lg transition-colors',
                scope[key] ? on : 'text-gray-300 hover:bg-white'
              )}
            >
              <Icon />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
