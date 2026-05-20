'use client';

import { useRouter } from '@bprogress/next';

import { buildScanConfigConfigureHref } from '@/features/scan-config/workflow/selection';
import { Button } from '@/ui/molecules/button';
import { log } from '@/utils/logger';

import type { ComponentProps, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type WorkflowConfigureUseModelLinkProps = {
  configurePathPrefix: string;
  entityType: TExtendedEntitiesTypeDict;
  entityId: string;
  query?: Record<string, string | undefined>;
  children: ReactNode;
  title?: string;
  className?: string;
} & Pick<ComponentProps<typeof Button>, 'rounded' | 'variant'>;

export function WorkflowConfigureUseModelLink({
  configurePathPrefix,
  entityType,
  entityId,
  query,
  children,
  title,
  className,
  rounded,
  variant = 'default',
}: WorkflowConfigureUseModelLinkProps) {
  const router = useRouter();
  log('debug', 'WorkflowConfigureUseModelLink', {
    configurePathPrefix,
    entityType,
    entityId,
    query,
    title,
  });
  return (
    <Button
      onClick={() => {
        const href = buildScanConfigConfigureHref({
          configurePathPrefix,
          entityType,
          entityId,
          query,
        });
        router.push(href);
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
