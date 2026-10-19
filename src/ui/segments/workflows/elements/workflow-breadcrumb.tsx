'use client';

import { useRouter } from '@bprogress/next';
import { useParams, usePathname } from 'next/navigation';

import { convertEntitySlugToExtendedType } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { BreadcrumbChip, BreadcrumbTrail } from '@/ui/molecules/breadcrumb';
import { useWorkflowSelectionConfig } from '@/ui/segments/workflows/browse/use-workflow-selection-config';
import { useWorkflowBreadcrumbState } from '@/ui/segments/workflows/browse/workflow-breadcrumb-context';
import {
  buildWorkflowHomeHref,
  getWorkflowSegment,
  resolveWorkflowBreadcrumb,
} from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

/**
 * single breadcrumb for every `/workflows/{activity}/new/{type}` page. The trail is resolved
 * from the workflow registry (explicit {@link IWorkflowDescriptor.breadcrumb}). Rendered in the
 * layout's `TopBar` start slot.
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

  if (!workflow || !activity) return null;

  const { root, trail } = resolveWorkflowBreadcrumb({
    workflow,
    activity,
    phase,
    activeEntityType: activeEntityType ?? targetType,
  });

  if (!root || trail.length === 0) return null;

  const homeLink = buildWorkflowHomeHref({
    activity,
    targetType,
    workspace: { virtualLabId, projectId },
  });

  const handleBack = () => (onBack ? onBack() : navigate(homeLink));

  return (
    <BreadcrumbChip>
      <BreadcrumbTrail
        items={[
          { key: 'root', label: root, href: homeLink, current: false },
          ...trail.map((crumb) => ({
            key: crumb.phase,
            label: crumb.node,
            current: crumb.isCurrent,
            // click an older crumb to jump back to that screen; for the pre-step crumb it
            // does the same thing the back arrow does (takes you back to the picker)
            onClick: crumb.isCurrent ? undefined : handleBack,
          })),
        ]}
      />
    </BreadcrumbChip>
  );
}
