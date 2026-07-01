'use client';

import { LeftOutlined, LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Checkbox } from '@/ui/molecules/checkbox';
import { Modal } from '@/ui/molecules/modal';
import { formatNumber } from '@/util/common';
import { cn } from '@/utils/css-class';

import { useTaskCostEstimates } from './use-task-cost-estimates';

import type { CostConfirmationModalProps } from './types';

export { useCostConfirmation } from './use-cost-confirmation';

const ITEMS_PER_PAGE = 10;

export function CostConfirmationModal({
  open,
  onClose,
  onConfirm,
  items,
  taskType,
  workflowLabel,
  context,
}: CostConfirmationModalProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const { data: itemsWithCosts, isLoading } = useTaskCostEstimates({
    items,
    taskType,
    context,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setCheckedIds(new Set(items.map((item) => item.id)));
      setCurrentPage(1);
    }
  }, [open, items]);

  const onCheckChange = useCallback((id: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const totalPages = Math.ceil((itemsWithCosts?.length ?? 0) / ITEMS_PER_PAGE);
  const hasPagination = totalPages > 1;

  const currentPageItems = useMemo(() => {
    if (!itemsWithCosts) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return itemsWithCosts.slice(start, start + ITEMS_PER_PAGE);
  }, [itemsWithCosts, currentPage]);

  const totalCredits = useMemo(() => {
    if (!itemsWithCosts) return 0;
    return itemsWithCosts
      .filter((item) => checkedIds.has(item.id))
      .reduce((sum, item) => sum + (item.cost ?? 0), 0);
  }, [itemsWithCosts, checkedIds]);

  const checkedCount = checkedIds.size;

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(checkedIds));
  }, [onConfirm, checkedIds]);

  const footer = (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        className="text-primary-9 cursor-pointer px-4 py-2 text-lg transition-colors hover:opacity-80"
        onClick={onClose}
      >
        Cancel
      </button>
      <button
        type="button"
        className="bg-primary-9 hover:bg-primary-8 cursor-pointer rounded-full px-8 py-2.5 text-lg text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleConfirm}
        disabled={checkedCount === 0 || isLoading}
      >
        Confirm
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title=" "
      footer={footer}
      headerClassName="[&_#modal-title]:text-primary-9 border-b-0 p-4 pb-0"
      bodyClassName="px-12 py-0"
      footerClassName="border-t-0 justify-center px-18 pb-10 pt-8"
    >
      <div className="text-primary-9 flex flex-col gap-4">
        <h4 className="text-lg mb-4">
          Estimated cost breakdown for the {checkedCount} selected{' '}
          {/* TODO: consider having singular and plural labels in workflow definitions */}
          {checkedCount === 1 ? workflowLabel.replace(/s$/, '') : workflowLabel}.
        </h4>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingOutlined className="text-2xl" />
          </div>
        )}

        {!isLoading && itemsWithCosts && (
          <>
            <div className="flex flex-col">
              {currentPageItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center justify-between py-3',
                    (hasPagination || index < currentPageItems.length - 1) &&
                      'border-b border-neutral-2'
                  )}
                >
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Radix Checkbox renders an input internally */}
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={checkedIds.has(item.id)}
                      onCheckedChange={(checked) => onCheckChange(item.id, checked === true)}
                      className="border-primary-9 data-[state=checked]:bg-primary-9 data-[state=checked]:border-primary-9 data-[state=checked]:text-white"
                    />
                    <span className="text-lg font-bold">{item.name}</span>
                  </label>
                  <span className="shrink-0 text-right text-lg">
                    {item.cost !== null ? `${formatNumber(item.cost)} credits` : '-- credits'}
                  </span>
                </div>
              ))}

              {/* Pad the last/partial page with invisible filler rows so every page keeps
                  the same height and the centered modal does not jump when paginating. */}
              {hasPagination &&
                Array.from({ length: ITEMS_PER_PAGE - currentPageItems.length }).map((_, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder fillers
                    key={`filler-${i}`}
                    aria-hidden
                    className="flex items-center justify-between border-b border-transparent py-3"
                  >
                    <span className="text-lg invisible font-bold">placeholder</span>
                  </div>
                ))}
            </div>

            {hasPagination && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}

            <div className="flex items-center justify-between border-t border-neutral-3 pt-4">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold">{formatNumber(totalCredits)} credits</span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-neutral-1 disabled:cursor-not-allowed disabled:opacity-30"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <LeftOutlined className="text-xs" />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm transition-colors',
            page === currentPage ? 'bg-primary-9 text-white' : 'text-neutral-6 hover:bg-neutral-1'
          )}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-neutral-1 disabled:cursor-not-allowed disabled:opacity-30"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <RightOutlined className="text-xs" />
      </button>
    </div>
  );
}
