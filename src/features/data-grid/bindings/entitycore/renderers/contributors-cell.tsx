import { AgentType } from '@/api/entitycore/types/shared/global';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { EMPTY_PLACEHOLDER } from '../columns/catalog';

import type { CellRendererProps } from '../../../react';

/** Cell-renderer registry key for the contributors cell. */
export const CONTRIBUTORS_RENDERER = 'contributors';

/** How many contributor names show inline before collapsing the rest behind "+N". */
const MAX_INLINE = 2;

interface Agent {
  type?: string | null;
  pref_label?: string | null;
}
interface ContributorsRow {
  contributions?: Array<{ agent?: Agent | null } | null> | null;
}

function isPerson(agent: Agent): boolean {
  return agent.type === AgentType.Person;
}

/**
 * Contributors cell: shows the first two names inline, then a "+N" pill when there
 * are more. Hovering the pill reveals a tooltip listing the remaining contributors
 * split into People and Institutions. Institutions sort before people (matching the
 * legacy `transformAgentToNames` ordering).
 */
export function ContributorsCell({ row }: CellRendererProps<ContributorsRow>) {
  const agents = (row?.contributions ?? [])
    .map((c) => c?.agent)
    .filter((a): a is Agent => Boolean(a?.pref_label));

  if (agents.length === 0) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;

  const institutions = agents.filter((a) => !isPerson(a));
  const people = agents.filter(isPerson);
  const ordered = [...institutions, ...people];

  const inline = ordered.slice(0, MAX_INLINE);
  const rest = ordered.slice(MAX_INLINE);

  return (
    <div className="flex h-full w-full items-center gap-1.5">
      <span className="min-w-0 truncate text-primary-8">
        {inline.map((a) => a.pref_label).join(', ')}
      </span>
      {rest.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                // fully-round pill that never squishes, with a soft raised shadow
                'inline-flex h-6 min-w-6 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-2',
                'bg-gray-100 text-[11px] font-medium text-gray-600 shadow-sm ring-1 ring-gray-200/70',
                'transition-colors hover:bg-primary-8 hover:text-white'
              )}
              aria-label={`${rest.length} more contributors`}
            >
              +{rest.length}
            </button>
          </TooltipTrigger>
          {/* full list — including the names shown inline — grouped by kind */}
          <TooltipContent
            showArrow
            side="left"
            align="start"
            alignOffset={-3}
            arrowClassName="bg-white"
            className="w-64 border border-gray-100 bg-white p-0 text-primary-8 shadow-lg"
          >
            {/* fixed-height, scrollable body so long lists never overflow the viewport */}
            <div className="max-h-56 overflow-y-auto p-2">
              <ContributorGroup title="Institutions" agents={institutions} />
              <ContributorGroup title="People" agents={people} />
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function ContributorGroup({ title, agents }: { title: string; agents: Agent[] }) {
  if (agents.length === 0) return null;
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="mb-0.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      <ul className="flex flex-col">
        {agents.map((a, i) => (
          <li
            key={`${a.pref_label}-${i}`}
            className="cursor-default rounded-md px-2 py-1 text-xs transition-colors hover:bg-gray-50"
          >
            {a.pref_label}
          </li>
        ))}
      </ul>
    </div>
  );
}
