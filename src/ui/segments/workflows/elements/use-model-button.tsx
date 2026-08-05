'use client';

import { useRouter } from '@bprogress/next';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { buildConfigureUrlForEntity } from '@/ui/segments/workflows/config/routes';
import { WORKFLOW_NAV_DOWN } from '@/utils/workflow-view-transition';

import type { ComponentProps, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

type WorkflowUseModelButtonProps = {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
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
  query,
  children,
  title,
  className,
  rounded,
  variant = 'default',
}: WorkflowUseModelButtonProps) {
  const router = useRouter();
  const { virtualLabId, projectId } = useWorkspace();

  return (
    <Button
      onClick={() => {
        router.push(
          buildConfigureUrlForEntity({
            activity,
            targetType,
            workspace: { virtualLabId, projectId },
            entityId,
            entityType,
            query,
          }),
          { transitionTypes: [WORKFLOW_NAV_DOWN] }
        );
      }}
      rounded={rounded}
      title={title}
      variant={variant}
      className={className}
    >
      {children}
    </Button>
  );
}
