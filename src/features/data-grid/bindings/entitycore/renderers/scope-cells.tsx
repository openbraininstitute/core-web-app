'use client';

import { GlobalOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import {
  SCOPE_KINDS,
  SCOPE_LABELS,
  scopeKindOf,
  shownBy,
  showScope,
  toggled,
} from '@/features/data-grid/bindings/entitycore/scope-filter';
import { FilterValueKind } from '@/features/data-grid/core';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { projectScopeIconFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { openSpaceSwitcher } from '@/ui/segments/workspaces/space-switcher/event';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { ReactElement, ReactNode } from 'react';
import type { IScopeRow, TScopeKind } from '@/features/data-grid/bindings/entitycore/scope-filter';
import type { ICellRendererProps, IHeaderRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the public/project scope icon. */
export const SCOPE_RENDERER = 'scope';

/** Header-renderer registry key for the scope toggles. */
export const SCOPE_HEADER_RENDERER = 'scopeHeader';

/** One colour per scope, shared by the cells and the header toggles. */
const SCOPE_COLORS = { public: 'text-green-600', project: 'text-primary-4' } as const;

/** Delay before a scope card opens, so sweeping down the column does not flash one per row. */
const TOOLTIP_DELAY_MS = 200;

/** The project mark: two people, or one while the `project-scope-icon` flag says so. */
function ProjectIcon({ 'aria-label': ariaLabel }: { 'aria-label': string }) {
  const Icon = useFlag(projectScopeIconFlag.key) === 'one' ? UserOutlined : TeamOutlined;
  return <Icon aria-label={ariaLabel} />;
}

/** A globe with a person badge: the project's own data, made public. */
function GlobeWithProjectBadge({ muted }: { muted?: boolean }) {
  return (
    <svg
      role="img"
      aria-label={SCOPE_LABELS.published}
      viewBox="0 0 24 24"
      width="1.2em"
      height="1.2em"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="10" cy="10" r="7.7" />
        <ellipse cx="10" cy="10" rx="3.3" ry="7.7" />
        <path d="M2.3 10h15.4" />
      </g>
      {/* the ring cuts the badge out of the globe */}
      <circle cx="16.5" cy="16.5" r="7.5" className="fill-white" />
      <circle
        cx="16.5"
        cy="16.5"
        r="6.5"
        className={cn('scope-badge', muted ? 'fill-gray-300' : 'fill-primary-4')}
      />
      <circle cx="16.5" cy="14.2" r="2.2" fill="white" />
      <path d="M12.4 21c.4-2.4 2-3.6 4.1-3.6s3.7 1.2 4.1 3.6z" fill="white" />
    </svg>
  );
}

/**
 * A globe, people, or for the project's made-public data a globe with a person badge.
 * `muted` leaves the colour to the parent, as do greyed rows through the `scope-mark` and
 * `scope-badge` classes. Colours sit on wrappers: on the icon itself a colour class ties
 * with antd's `.anticon { color: inherit }`, and whichever stylesheet loaded last wins.
 */
export function ScopeMark({ kind, muted }: { kind: TScopeKind; muted?: boolean }) {
  const tint = (scope: keyof typeof SCOPE_COLORS) =>
    cn('scope-mark inline-flex', !muted && SCOPE_COLORS[scope]);
  if (kind === 'published') {
    return (
      <span className={tint('public')}>
        <GlobeWithProjectBadge muted={muted} />
      </span>
    );
  }
  if (kind === 'public') {
    return (
      <span className={tint('public')}>
        <GlobalOutlined aria-label={SCOPE_LABELS.public} />
      </span>
    );
  }
  return (
    <span className={tint('project')}>
      <ProjectIcon aria-label={SCOPE_LABELS[kind]} />
    </span>
  );
}

/**
 * The hover card for the scope icons: white, as wide as its text up to 250px, hanging
 * below the icon with its arrow a short way in from the left edge.
 */
function LightTooltip({
  label,
  ariaLabel,
  children,
}: {
  label: ReactNode;
  /** screen-reader copy of the content, which can hold a button */
  ariaLabel: string;
  /** the hovered element; Radix hands it a ref and its handlers */
  children: ReactElement;
}) {
  return (
    <Tooltip delayDuration={TOOLTIP_DELAY_MS}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        // the card starts 12px left of the trigger, which the arrow below accounts for
        alignOffset={-12}
        sideOffset={8}
        aria-label={ariaLabel}
        // Radix flips its own arrow for a bottom card and hides the top borders, so the
        // arrow is drawn here instead
        showArrow={false}
        className="text-primary-9 relative w-max max-w-[250px] border border-gray-200 bg-white shadow-md"
      >
        {label}
        <span
          aria-hidden
          className="absolute -top-[6px] size-2.5 rotate-45 border-t border-l border-gray-200 bg-white"
          style={{ left: 'calc(12px + var(--radix-tooltip-trigger-width) / 2 - 5px)' }}
        />
      </TooltipContent>
    </Tooltip>
  );
}

/** Rendered only while its card is open, so the project is fetched on demand. */
function ProjectScopeHint({
  published,
  canChangeProject,
}: {
  published: boolean;
  canChangeProject: boolean;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
    enabled: !!virtualLabId && !!projectId,
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <div className="flex flex-col items-start gap-1.5">
      <span>Project{project?.name ? `: ${project.name}` : ''}</span>
      {published && <span>Made public</span>}
      {canChangeProject && (
        <button
          type="button"
          onClick={openSpaceSwitcher}
          className="bg-primary-1 text-primary-9 hover:bg-primary-2 rounded-full px-2.5 py-0.5 font-semibold transition-colors"
        >
          Change project
        </button>
      )}
    </div>
  );
}

/**
 * The scope's hover card, shared by the header toggles and the row icons.
 * `canChangeProject` offers "Change project": the column header's icons only, not every row's.
 */
function ScopeTooltip({
  kind,
  canChangeProject = false,
  children,
}: {
  kind: TScopeKind;
  canChangeProject?: boolean;
  children: ReactElement;
}) {
  return (
    <LightTooltip
      ariaLabel={SCOPE_LABELS[kind]}
      label={
        kind === 'public' ? (
          <span>{SCOPE_LABELS.public}</span>
        ) : (
          <ProjectScopeHint published={kind === 'published'} canChangeProject={canChangeProject} />
        )
      }
    >
      {children}
    </LightTooltip>
  );
}

/** A row's scope icon with its hover card; greyed on a hierarchy row kept only for its children. */
export function ScopeCell({ row }: ICellRendererProps<IScopeRow>): ReactNode | null {
  const { projectId } = useWorkspace();
  const kind = row && scopeKindOf(row, projectId);
  if (!kind) return EMPTY_PLACEHOLDER;
  return (
    <span className="flex h-full items-center justify-center text-lg">
      {/* the icon is the trigger, so the card hangs from it and not from the cell's edge */}
      <ScopeTooltip kind={kind}>
        <span data-testid={`scope-cell-${kind}`} className="inline-flex">
          <ScopeMark kind={kind} muted={row.isFiltered === false} />
        </span>
      </ScopeTooltip>
    </span>
  );
}

/**
 * A toggle per kind of row, and no more than these three, in place of the scope column's
 * label and filter: the globe for public data from other projects, the people for the
 * project's private data, and the globe with a badge for the project's data made public.
 * Each is coloured when its rows are shown and grey when not. All on (the default) filters
 * nothing, and a click then keeps only that kind. After that a click switches a kind alone,
 * and the last one on stays on.
 */
export function ScopeHeader({ columnId, ctx }: IHeaderRendererProps) {
  const state = useGridState(ctx.controller);
  const entry = state.filters[columnId];
  const shown = shownBy(entry?.value.kind === FilterValueKind.Text ? entry.value.text : '');
  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {SCOPE_KINDS.map((kind) => {
        const isOn = shown.has(kind);
        const next = toggled(shown, kind);
        return (
          <ScopeTooltip key={kind} kind={kind} canChangeProject>
            <button
              type="button"
              aria-pressed={isOn}
              aria-disabled={!next}
              aria-label={SCOPE_LABELS[kind]}
              data-testid={`scope-header-${kind}`}
              onClick={() => next && showScope(ctx.controller, columnId, next)}
              className={cn(
                'flex size-6 items-center justify-center rounded-full text-lg transition-colors',
                'focus-visible:ring-primary-6 outline-none focus-visible:ring-2',
                // an on mark carries its own colour; an off one takes this grey
                !isOn && 'text-gray-300 hover:text-gray-500',
                next ? 'hover:bg-gray-100' : 'cursor-default'
              )}
            >
              <ScopeMark kind={kind} muted={!isOn} />
            </button>
          </ScopeTooltip>
        );
      })}
    </div>
  );
}
