'use client';

import { RightOutlined } from '@ant-design/icons';

import { findWorkflowDescriptorByDefinitionId } from '@/features/scan-config/workflow/components';
import { useScanConfigWorkflow } from '@/features/scan-config/workflow/context';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { getActivity, getWorkflowEntityLabel } from '@/ui/segments/workflows/config';
import { cn } from '@/utils/css-class';

/**
 * Configure-page trail: which activity you are in, then what it is pointed at
 * (`Extract › Electrical cell recording`). Rendered as a chip centred on the card's
 * top border, so it reads as a label on the surface rather than another toolbar row.
 */
export function ScanConfigWorkflowBreadcrumb({ className }: { className?: string }) {
  const { definition, entity } = useScanConfigWorkflow();
  const workflow = findWorkflowDescriptorByDefinitionId(definition.id);

  const activityLabel = getActivity(definition.activity)?.label;
  // the workflow's own name, resolved exactly as the workflows home page resolves it —
  // `entity.entityType` is the scan-config type, which flattens every circuit kind to "Circuit"
  const typeLabel =
    workflow?.label ?? getWorkflowEntityLabel(workflow?.sourceType ?? entity.entityType);

  if (!activityLabel && !typeLabel) return null;

  return (
    <div className={cn('pointer-events-none flex justify-center', className)}>
      <div className="border-neutral-2 pointer-events-auto flex h-9 items-center rounded-full border bg-white px-5 shadow-sm">
        <Breadcrumb>
          <BreadcrumbList className="gap-2 sm:gap-2">
            {activityLabel ? (
              <BreadcrumbItem>
                <span className="text-sm font-light text-gray-500">{activityLabel}</span>
              </BreadcrumbItem>
            ) : null}

            {activityLabel && typeLabel ? (
              <BreadcrumbSeparator className="text-gray-400">
                <RightOutlined className="text-[10px]" />
              </BreadcrumbSeparator>
            ) : null}

            {typeLabel ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-primary-9 text-sm font-medium">
                  {typeLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
