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
import {
  getActivity,
  getEntityMeta,
  getWorkflow,
  getWorkflowBrowseSelectionLabel,
  getWorkflowSegment,
} from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { KebabCase } from '@/utils/type';

type Props = {
  section: TWorkspaceSection;
};

export function SimulateWorkflowsBreadcrumb(_props: Props) {
  const pathname = usePathname();
  const segment = getWorkflowSegment(pathname);

  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();

  const dataType = convertEntitySlugToExtendedType({ type });
  const category = getActivity(segment)?.name;

  const selectTitle = getWorkflowBrowseSelectionLabel({
    activity: segment,
    targetType: dataType,
  });
  const buildTitle = getEntityMeta(dataType)?.label;
  const resolvedWorkflow =
    segment && dataType
      ? (getWorkflow({
          activity: segment,
          targetType: dataType,
        }) ??
        getWorkflow({
          activity: segment,
          sourceType: dataType,
        }))
      : null;
  const workflowLabel = resolvedWorkflow?.label;
  const leftTitle =
    segment === WorkflowActivityDictValue.process && workflowLabel
      ? `${workflowLabel} data processing`
      : [buildTitle, category].filter(Boolean).join(' ');

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
