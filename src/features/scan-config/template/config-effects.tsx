'use client';

import { isEqual } from 'es-toolkit';
import { useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';

import { getConfigKeyForEntity } from '@/features/scan-config/helpers';
import { useDefaultValidationTargets } from '@/features/scan-config/hooks/use-default-validation-targets';
import { useSetConfig, useWholeConfig } from '@/features/scan-config/use-config-store';
import { workflowBreadcrumbRefsAtom } from '@/features/scan-config/workflow/breadcrumb-entities';
import { resolveWorkflowEntityRefs } from '@/features/scan-config/workflow/workflow-schema-selection';
import { useAgentState } from '@/services/ai-agent';

import type { ScanConfigTemplateProps } from './types';

/** Everything that follows the whole config without drawing anything: it re-renders alone on each edit. */
export function ScanConfigConfigEffects({ props }: { props: ScanConfigTemplateProps }) {
  const { schema, schemaName, aiEnabled, entityType, activity, entity } = props;
  const config = useWholeConfig();
  const setConfig = useSetConfig();

  useDefaultValidationTargets({ schemaName, config, setConfig });

  useAgentState(
    aiEnabled
      ? getConfigKeyForEntity(
          entityType,
          activity,
          entity as { scale?: string } | undefined,
          schemaName
        )
      : null,
    config
  );

  const setBreadcrumbRefs = useSetAtom(workflowBreadcrumbRefsAtom);
  const entityRefs = useMemo(() => resolveWorkflowEntityRefs(schema, config), [schema, config]);
  useEffect(() => {
    setBreadcrumbRefs((current) =>
      current && isEqual(current, entityRefs) ? current : entityRefs
    );
  }, [entityRefs, setBreadcrumbRefs]);
  useEffect(() => () => setBreadcrumbRefs(null), [setBreadcrumbRefs]);

  return null;
}
