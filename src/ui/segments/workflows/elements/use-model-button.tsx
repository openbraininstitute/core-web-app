'use client';

import { useRouter } from '@bprogress/next';

import { getWorkflowLifecycleBlockReason } from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config/routes';
import {
  WORKFLOW_BLOCKED_ACTION_CLASS,
  WorkflowBlockedActionTooltip,
} from '@/ui/segments/workflows/elements/workflow-blocked-action-tooltip';
import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TLifecycleStatusCarrier } from '@/entity-configuration/domain/workflow-lifecycle-eligibility';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

type WorkflowUseModelButtonProps = {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
  entity?: TLifecycleStatusCarrier;
  query?: Record<string, string | undefined>;
  children: ReactNode;
  title?: string;
  className?: string;
} & Pick<ComponentProps<typeof Button>, 'rounded' | 'variant'>;

export function WorkflowUseModelButton({
  activity,
  targetType,
  entityId,
  entityType,
  entity,
  query,
  children,
  title,
  className,
  rounded,
  variant = 'default',
}: WorkflowUseModelButtonProps) {
  const router = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const blockReason = entity ? getWorkflowLifecycleBlockReason(entity) : undefined;

  return (
    <WorkflowBlockedActionTooltip reason={blockReason} side="top" align="end">
      <Button
        onClick={() => {
          if (blockReason) return;
          router.push(
            buildConfigureUrlForEntity({
              activity,
              targetType,
              workspace: { virtualLabId, projectId },
              entityId,
              entityType,
              query,
            })
          );
        }}
        rounded={rounded}
        title={blockReason ? undefined : title}
        variant={variant}
        className={cn(
          blockReason ? cn('h-12 px-10 font-bold', WORKFLOW_BLOCKED_ACTION_CLASS) : className
        )}
        disabled={Boolean(blockReason)}
      >
        {children}
      </Button>
    </WorkflowBlockedActionTooltip>
  );
}
