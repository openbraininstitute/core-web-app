'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

import { convertEntitySlugToExtendedType } from '@/api/entitycore/utils';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';
import { useWorkflowBreadcrumbState } from '@/ui/segments/workflows/browse/workflow-breadcrumb-context';
import { getWorkflowSegment, resolveWorkflowBreadcrumb } from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

/**
 * single breadcrumb for every `/workflows/{activity}/new/{type}` page. The trail is resolved
 * from the workflow registry (explicit {@link IWorkflowDescriptor.breadcrumb}
 */
export function WorkflowBreadcrumb() {
  const pathname = usePathname();
  const activity = getWorkflowSegment(pathname);

  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const targetType = convertEntitySlugToExtendedType({ type });

  const { virtualLabId, projectId } = useWorkspace();
  const { phase, activeEntityType } = useWorkflowBreadcrumbState();
  const { workflow } = useWorkflowSelectionConfig({ activity, targetType });

  if (!workflow || !activity) {
    return <div className="px-3 pt-4 pb-2" />;
  }

  const { root, current } = resolveWorkflowBreadcrumb({
    workflow,
    activity,
    phase,
    activeEntityType: activeEntityType ?? targetType,
  });

  if (!root || !current) {
    return <div className="px-3 pt-4 pb-2" />;
  }

  const homeLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`;

  return (
    <div className="px-3 pt-4 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="text-primary-9 hover:text-primary-7 text-lg font-light"
            >
              <Link href={homeLink}>{root}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-primary-9 text-lg font-bold">
            <RightOutlined className="text-sm" />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="text-primary-9 hover:text-primary-7 text-lg font-bold">
            {current}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
