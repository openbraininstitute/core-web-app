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
    return <div className="pt-4 pr-3 pb-2 pl-4" />;
  }

  const { root, trail } = resolveWorkflowBreadcrumb({
    workflow,
    activity,
    phase,
    activeEntityType: activeEntityType ?? targetType,
  });

  if (!root || trail.length === 0) {
    return <div className="pt-4 pr-3 pb-2 pl-4" />;
  }

  const homeLink = buildWorkflowHomeHref({
    activity,
    targetType,
    workspace: { virtualLabId, projectId },
  });

  const handleBack = () => (onBack ? onBack() : navigate(homeLink));

  return (
    <div className="pt-4 pr-3 pb-2 pl-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {/* icon pill styled EXACTLY like the grid's column chooser so the two align visually */}
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              title="Go back"
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-8 shadow-sm',
                'transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md active:scale-95'
              )}
            >
              <RiArrowLeftLongLine size={18} />
            </button>
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
