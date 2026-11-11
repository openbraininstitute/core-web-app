import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';

export type CostConfirmationItem = {
  id: string;
  name: string;
};

export type CostConfirmationItemWithCost = CostConfirmationItem & {
  cost: number | null;
};

export type CostConfirmationModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
  items: CostConfirmationItem[];
  taskType: TObiOneTaskType;
  workflowLabel: string;
  context: WorkspaceContext;
};
