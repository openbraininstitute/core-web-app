import {
  OTHER_PROJECT_HINT,
  ProjectOwnership,
  ProjectOwnershipBadge,
  ProjectOwnershipLabel,
  Visibility,
  VisibilityBadge,
  VisibilityLabel,
} from '@/features/data-grid/bindings/entitycore/columns/ownership';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { IconBadge } from '@/ui/molecules/icon-badge';
import { IconBadgeTone } from '@/ui/molecules/icon-badge/helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { EntityAuthorization } from '@/api/entitycore/types/shared/global';
import type { ICellRendererProps } from '@/features/data-grid/react';

export {
  PROJECT_OWNERSHIP_RENDERER,
  VISIBILITY_RENDERER,
} from '@/features/data-grid/bindings/entitycore/columns/ownership';

/** Wide enough for the longer label, so the column's badges line up; px, like the badge text. */
const VISIBILITY_BADGE_WIDTH = 'min-w-[68px]';
const MUTED_ON_GREYED_ROW = 'in-[.filtered-out]:opacity-50';

type TOwnershipRow = ICellRendererProps<Partial<EntityAuthorization>>;

/** This project as a badge; another project's row as quiet text, explained in a tooltip. */
export function ProjectOwnershipCell({ row }: TOwnershipRow) {
  const { projectId } = useWorkspace();
  if (!row?.authorized_project_id || !projectId) return EMPTY_PLACEHOLDER;
  const ownership =
    row.authorized_project_id === projectId ? ProjectOwnership.Current : ProjectOwnership.Other;
  const badge = ProjectOwnershipBadge[ownership];
  return (
    <div
      data-testid="project-ownership-mark"
      data-ownership={ownership}
      className={cn('flex h-full w-full items-center', MUTED_ON_GREYED_ROW)}
    >
      {badge ? (
        <IconBadge icon={badge.icon} tone={badge.tone}>
          {ProjectOwnershipLabel[ownership]}
        </IconBadge>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <IconBadge icon={null} tone={IconBadgeTone.Quiet}>
                {ProjectOwnershipLabel[ownership]}
              </IconBadge>
            </span>
          </TooltipTrigger>
          <TooltipContent showArrow side="right">
            {OTHER_PROJECT_HINT}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/** Public or Private as the badge its filter option shows. */
export function VisibilityCell({ row }: TOwnershipRow) {
  if (typeof row?.authorized_public !== 'boolean') return EMPTY_PLACEHOLDER;
  const visibility = row.authorized_public ? Visibility.Public : Visibility.Private;
  const { icon, tone } = VisibilityBadge[visibility];
  return (
    <div
      data-testid="visibility-mark"
      data-visibility={visibility}
      className={cn('flex h-full w-full items-center', MUTED_ON_GREYED_ROW)}
    >
      <IconBadge icon={icon} tone={tone} className={VISIBILITY_BADGE_WIDTH}>
        {VisibilityLabel[visibility]}
      </IconBadge>
    </div>
  );
}
