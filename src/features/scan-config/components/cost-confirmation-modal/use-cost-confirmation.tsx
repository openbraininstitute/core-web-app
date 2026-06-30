'use client';

import { useCallback, useState } from 'react';

import { CostConfirmationModal } from './index';

import type { ReactNode } from 'react';
import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';
import type { CostConfirmationItem } from './types';

type UseCostConfirmationParams = {
  items: CostConfirmationItem[];
  taskType: TObiOneTaskType;
  workflowLabel: string;
  context: WorkspaceContext;
  onConfirm: (ids: string[]) => void;
};

/**
 * Owns the open-state, render, and confirm wiring for the {@link CostConfirmationModal}.
 *
 * Callers build the `items` for their selection and call `openModal()` from their launch button;
 * the returned `modal` node must be rendered (it fetches estimates only while open). On confirm the
 * modal closes and `onConfirm` runs with the checked ids.
 */
export function useCostConfirmation({
  items,
  taskType,
  workflowLabel,
  context,
  onConfirm,
}: UseCostConfirmationParams): { openModal: () => void; modal: ReactNode } {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const handleConfirm = useCallback(
    (ids: string[]) => {
      setOpen(false);
      onConfirm(ids);
    },
    [onConfirm]
  );

  const modal = (
    <CostConfirmationModal
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      items={items}
      taskType={taskType}
      workflowLabel={workflowLabel}
      context={context}
    />
  );

  return { openModal, modal };
}
