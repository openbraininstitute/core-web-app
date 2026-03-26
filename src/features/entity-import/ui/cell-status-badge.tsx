'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { RiInfoI } from '@remixicon/react';

import {
  getCellStatusMessage,
  getTableCellUiStatus,
  hasCellAttentionIssue,
  isAmbiguousRemoteCell,
  shouldDisplayCellStatusBadge,
  TableCellUiStatus,
} from '@/features/entity-import/ui/status';
import {
  ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
  ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME,
} from '@/features/entity-import/ui/tooltip-styles';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { IImportCellState } from '@/features/entity-import/core/contracts';

interface CellStatusBadgeProps {
  cell: IImportCellState;
  fieldLabel: string;
  rowIndex: number;
  onSelect?: () => void;
  extraContent?: ReactNode;
}

export function CellStatusBadge({
  cell,
  fieldLabel,
  rowIndex,
  onSelect,
  extraContent,
}: CellStatusBadgeProps) {
  if (!shouldDisplayCellStatusBadge(cell)) {
    return null;
  }

  const cellUiStatus = getTableCellUiStatus(cell);
  const tooltipMessage =
    getCellStatusMessage(cell) ??
    (cellUiStatus === TableCellUiStatus.Validating ? 'Validation in progress.' : null);

  if (!tooltipMessage) {
    return null;
  }

  const isSelectionState = isAmbiguousRemoteCell(cell);
  const isValidating = cellUiStatus === TableCellUiStatus.Validating;
  const hasAttentionIssue = hasCellAttentionIssue(cell);

  return (
    <div className="pointer-events-none absolute top-1.5 right-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Show status for ${fieldLabel} row ${rowIndex}`}
            className={cn(
              ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME,
              'pointer-events-auto',
              hasAttentionIssue &&
                'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300',
              isValidating &&
                'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300'
            )}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.();
            }}
          >
            {isValidating ? <LoadingOutlined /> : <RiInfoI className="size-3" />}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={0}
          alignOffset={-10}
          arrowClassName="bg-white "
          className={ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME}
        >
          <div className="space-y-2 px-1 py-1 text-pretty">
            <div>{tooltipMessage}</div>
            {isSelectionState && hasAttentionIssue ? (
              <div className="text-neutral-600">
                Open the validator and choose the correct value for this cell.
              </div>
            ) : null}
            {extraContent}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
