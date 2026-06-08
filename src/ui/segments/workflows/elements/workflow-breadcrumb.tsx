'use client';

import { RightOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { RiArrowLeftLongLine } from '@remixicon/react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { convertEntitySlugToExtendedType } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { Button } from '@/ui/molecules/button';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';
import { useWorkflowBreadcrumbState } from '@/ui/segments/workflows/browse/workflow-breadcrumb-context';
import {
  buildWorkflowHomeHref,
  getWorkflowSegment,
  resolveWorkflowBreadcrumb,
} from '@/ui/segments/workflows/config';
import { cn } from '@/utils/css-class';

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

  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const { phase, activeEntityType, onBack } = useWorkflowBreadcrumbState();
  const { workflow } = useWorkflowSelectionConfig({ activity, targetType });

  if (!workflow || !activity) {
    return <div className="px-3 pt-4 pb-2" />;
  }

  const { root, trail } = resolveWorkflowBreadcrumb({
    workflow,
    activity,
    phase,
    activeEntityType: activeEntityType ?? targetType,
  });

  if (!root || trail.length === 0) {
    return <div className="px-3 pt-4 pb-2" />;
  }

  const homeLink = buildWorkflowHomeHref({
    activity,
    targetType,
    workspace: { virtualLabId, projectId },
  });

  const handleBack = () => (onBack ? onBack() : navigate(homeLink));

  return (
    <div className="px-3 pt-4 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Button
              rounded
              variant="icon"
              onClick={handleBack}
              aria-label="Go back"
              className={cn(
                'text-primary-9 bg-white! shadow-bnb hover:text-primary-7 hover:border hover:bg-gray-50! size-8!',
                'flex items-center justify-center rounded-full transition-colors'
              )}
            >
              <RiArrowLeftLongLine className="text-base" />
            </Button>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="text-primary-9 hover:text-primary-7 text-lg font-light"
            >
              <Link href={homeLink}>{root}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {trail.map((crumb) => (
            <Fragment key={crumb.phase}>
              <BreadcrumbSeparator className="text-primary-9 text-lg font-bold">
                <RightOutlined className="text-sm" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {crumb.isCurrent ? (
                  <BreadcrumbPage className="text-primary-9 text-lg font-bold">
                    {crumb.node}
                  </BreadcrumbPage>
                ) : (
                  // click an older crumb to jump back to that screen; for the pre-step crumb it
                  // does the same thing the back arrow does (takes you back to the picker)
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-primary-9 hover:text-primary-7 text-lg font-light transition-colors"
                  >
                    {crumb.node}
                  </button>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
