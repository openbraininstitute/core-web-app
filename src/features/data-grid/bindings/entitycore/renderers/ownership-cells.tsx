import {
  ProjectOwnership,
  ProjectOwnershipBadge,
  ProjectOwnershipLabel,
  Visibility,
  VisibilityBadge,
  VisibilityLabel,
} from '@/features/data-grid/bindings/entitycore/columns/ownership';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Icon } from '@/ui/molecules/icon';
import { IconBadge } from '@/ui/molecules/icon-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { EntityAuthorization } from '@/api/entitycore/types/shared/global';
import type { ICellRendererProps } from '@/features/data-grid/react';

export {
  PROJECT_OWNERSHIP_RENDERER,
  VISIBILITY_RENDERER,
} from '@/features/data-grid/bindings/entitycore/columns/ownership';

/** Wide enough for the longest label, so a column's badges line up; px, like the badge text. */
const PROJECT_BADGE_WIDTH = 'min-w-[100px]';
const VISIBILITY_BADGE_WIDTH = 'min-w-[68px]';
const MUTED_ON_GREYED_ROW = 'in-[.filtered-out]:opacity-50';

type TOwnershipRow = ICellRendererProps<Partial<EntityAuthorization>>;

/** The row's project as the badge its filter option shows; a globe when this project made it public. */
export function ProjectOwnershipCell({ row }: TOwnershipRow) {
  const { projectId } = useWorkspace();
  const isCurrent = Boolean(projectId) && row?.authorized_project_id === projectId;
  const isPublic = row?.authorized_public === true;
  if (!isCurrent && !isPublic) return EMPTY_PLACEHOLDER;

  const ownership = isCurrent ? ProjectOwnership.Current : ProjectOwnership.Other;
  const visibility = isPublic ? Visibility.Public : Visibility.Private;
  const label = `${ProjectOwnershipLabel[ownership]} · ${VisibilityLabel[visibility]}`;
  const { icon, tone } = ProjectOwnershipBadge[ownership];

  return (
    <div className="flex h-full w-full items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={label}
            data-testid="project-ownership-mark"
            data-ownership={ownership}
            data-visibility={visibility}
            className={cn('inline-flex items-center gap-1.5', MUTED_ON_GREYED_ROW)}
          >
            <IconBadge icon={icon} tone={tone} className={PROJECT_BADGE_WIDTH}>
              {ProjectOwnershipLabel[ownership]}
            </IconBadge>
            {isCurrent && isPublic && (
              <span
                data-testid="project-ownership-made-public"
                className="inline-flex [&_svg]:stroke-scope-public-fg"
              >
                <Icon name="globe" size={14} />
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent showArrow side="right">
          {label}
        </TooltipContent>
      </Tooltip>
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
