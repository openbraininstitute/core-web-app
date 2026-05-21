'use client';

import { useRouter } from '@bprogress/next';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { buildEntityConfigureHref } from '@/ui/segments/workflows/config/routes';

import type { ComponentProps, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config/types';

export type WorkflowConfigureUseModelLinkProps = {
  activity: TActivityValue;
  targetType: TExtendedEntitiesTypeDict;
  entityId: string;
  entityType?: TExtendedEntitiesTypeDict;
  originId?: string;
  query?: Record<string, string | undefined>;
  children: ReactNode;
  title?: string;
  className?: string;
} & Pick<ComponentProps<typeof Button>, 'rounded' | 'variant'>;

export function WorkflowConfigureUseModelLink({
  activity,
  targetType,
  entityId,
  entityType,
  originId,
  query,
  children,
  title,
  className,
  rounded,
  variant = 'default',
}: WorkflowConfigureUseModelLinkProps) {
  const router = useRouter();
  const { virtualLabId, projectId } = useWorkspace();

  return (
    <Button
      onClick={() => {
        router.push(
          buildEntityConfigureHref({
            activity,
            targetType,
            workspace: { virtualLabId, projectId },
            entityId,
            entityType,
            originId,
            query,
          })
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
