import { WorkspaceSection } from '@/constants';
import { byContext } from '@/features/data-grid/core';

import type { ISelectionSpec } from '@/features/data-grid/core';

/**
 * Multi-download checkboxes only in Data browse. Simulate/Build pick via mini-detail
 * or `mainTableProps.selectionType` (picker mode), so schema selection stays off there.
 */
export const dataBrowseSelection: ISelectionSpec = {
  enabled: byContext({
    default: false,
    rules: [{ when: { section: WorkspaceSection.Data }, value: true }],
  }),
};
