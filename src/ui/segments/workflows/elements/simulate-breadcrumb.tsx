'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { upperFirst } from 'node_modules/es-toolkit/dist/string/upperFirst.mjs';

import { convertEntitySlugToExtendedType } from '@/api/entitycore/utils';
import { config } from '@/config';
import { WorkflowActivityDictValue } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';
import {
  getActivity,
  getEntityMeta,
  getWorkflow,
  getWorkflowNewPageBreadcrumbSelectNoun,
  getWorkflowSegment,
} from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

export function SimulateWorkflowsBreadcrumb() {
  const pathname = usePathname();
  const activity = getWorkflowSegment(pathname);

  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();

  const dataType = convertEntitySlugToExtendedType({ type });
  const category = getActivity(activity)?.name;

  const { workflow, selectionConfig } = useWorkflowSelectionConfig({
    activity,
    targetType: dataType,
  });

  const resolvedWorkflow =
    workflow ??
    (activity
      ? (getWorkflow({ activity, targetType: dataType }) ??
        getWorkflow({ activity, sourceType: dataType }))
      : null);

  const selectTitle = getWorkflowNewPageBreadcrumbSelectNoun({
    workflow: resolvedWorkflow,
    selectionConfig,
  });

  const leftEntityType =
    resolvedWorkflow && resolvedWorkflow.sourceType !== resolvedWorkflow.targetType
      ? resolvedWorkflow.sourceType
      : dataType;
  const leftEntityLabel = getEntityMeta(leftEntityType)?.label;
  const workflowLabel = resolvedWorkflow?.label;
  const leftTitle =
    activity === WorkflowActivityDictValue.process && workflowLabel
      ? `${workflowLabel} data processing`
      : [leftEntityLabel, category].filter(Boolean).join(' ');

  const homeLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`;

  return (
    <div className="px-3 pt-4 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="text-primary-9 hover:text-primary-7 text-lg font-light select-none"
            >
              <Link href={homeLink}>{upperFirst(leftTitle.toLocaleLowerCase())}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-primary-9 text-lg font-bold">
            <RightOutlined className="text-sm" />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="text-primary-9 hover:text-primary-7 text-lg font-bold select-none cursor-pointer">
            {upperFirst(`Select ${selectTitle}`.toLocaleLowerCase())}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
