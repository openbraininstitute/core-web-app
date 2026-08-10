'use client';

import {
  EntityLifecycleStatus,
  getLifecycleStatusBadgeSpec,
  LifecycleStatusBadge,
} from '@/ui/molecules/lifecycle-status-badge';

import { EMPTY_PLACEHOLDER } from '../../../renderers/aggrid/empty-cell';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '../../../react';

export { EntityLifecycleStatus, getLifecycleStatusBadgeSpec };

/** Cell-renderer registry key for the shared lifecycle-status pill. */
export const LIFECYCLE_STATUS_RENDERER = 'lifecycleStatus';

interface ILifecycleStatusRow {
  lifecycle_status?: string | null;
}

/** Shared lifecycle-status cell; falls through to the empty placeholder if absent. */
export function LifecycleStatusCell({
  row,
}: ICellRendererProps<ILifecycleStatusRow>): ReactNode | null {
  if (!getLifecycleStatusBadgeSpec(row?.lifecycle_status)) return EMPTY_PLACEHOLDER;
  return <LifecycleStatusBadge status={row?.lifecycle_status} />;
}
