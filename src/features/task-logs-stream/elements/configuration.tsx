'use client';

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';
import { useState } from 'react';

import { SimpleGrid } from '@/features/data-grid/presets/simple-grid';
import { ActivityStatusColorMap } from '@/features/scan-config/constants';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { CodeBlock } from '@/ui/molecules/code-blocks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { SimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { ITaskLogsDataState } from '@/features/task-logs-stream/types';

type ConfigRow = { key: string; label: string; value: ReactNode; isCode?: boolean };

interface IProps {
  configuration: ITaskLogsDataState['configuration'];
}

function formatDateTime({ value }: { value: string | null | undefined }): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

function formatDuration({
  startTime,
  endTime,
}: {
  startTime: string | null | undefined;
  endTime: string | null | undefined;
}): string {
  if (!startTime || !endTime) return '—';
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '—';
  const durationMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalSeconds = Math.floor(durationMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} s`);

  return parts.join(', ');
}

function formatJson({ value }: { value: unknown }): string {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function Configuration({ configuration }: IProps) {
  const [isIdCopied, setIsIdCopied] = useState(false);

  if (!configuration) {
    return (
      <div className="w-full py-2 px-2">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-base text-destructive">
          Configuration details are not available yet. Start the task first, then check back to view
          its settings and setup information.
        </div>
      </div>
    );
  }

  const statusKey = String(configuration.status ?? 'unknown').toLowerCase();
  const statusLabel = statusKey.toUpperCase();
  const statusColor =
    ActivityStatusColorMap[statusKey as keyof typeof ActivityStatusColorMap] ?? '#6b7280';
  const startTime = (configuration.start_time as string | null | undefined) ?? null;
  const endTime = (configuration.end_time as string | null | undefined) ?? null;
  const duration = formatDuration({ startTime, endTime });

  const codeCell = ({ value }: { value: unknown }) => (
    <CodeBlock
      language="json"
      code={formatJson({ value })}
      scrollableX
      className="w-full max-w-full rounded-md"
      contentClassName="secondary-scrollbar"
    />
  );

  const executionId = String(configuration.id ?? '—');

  const onCopyExecutionId = async () => {
    if (!executionId || executionId === '—') return;
    await navigator.clipboard.writeText(executionId);
    setIsIdCopied(true);
    setTimeout(() => setIsIdCopied(false), 1400);
  };

  const rows: Array<ConfigRow> = [
    {
      key: 'id',
      label: 'id',
      value: (
        <div className="flex items-center justify-between gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="max-w-full truncate text-base text-neutral-800">{executionId}</span>
            </TooltipTrigger>
            <TooltipContent
              className="bg-white text-neutral-800 shadow-lg"
              arrowClassName="bg-white"
              side="top"
              sideOffset={4}
            >
              <span>Execution ID</span>
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="icon"
            size="sm"
            rounded
            onClick={onCopyExecutionId}
            className="shrink-0 border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
            aria-label="Copy execution id"
            title="Copy execution id"
          >
            {isIdCopied ? (
              <RiCheckLine className="size-4 text-emerald-700" />
            ) : (
              <RiFileCopyLine className="size-4" />
            )}
          </Button>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'status',
      value: (
        <Badge
          className="border-0 text-white"
          style={{
            backgroundColor: statusColor,
          }}
        >
          {statusLabel}
        </Badge>
      ),
    },
    {
      key: 'duration',
      label: 'duration',
      value: (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help text-base underline decoration-dotted underline-offset-4">
              {duration}
            </span>
          </TooltipTrigger>
          <TooltipContent
            className="bg-white text-neutral-800 shadow-lg"
            arrowClassName="bg-white"
            side="top"
            sideOffset={4}
          >
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <div className="text-primary-8 text-sm font-semibold">Start:</div>
              <div className="text-sm font-semibold text-gray-600">
                {formatDateTime({ value: startTime })}
              </div>
              <div className="text-primary-8 text-sm font-semibold">End:</div>
              <div className="text-sm font-semibold text-gray-600">
                {formatDateTime({ value: endTime })}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      key: 'inputs',
      label: 'inputs',
      value: codeCell({ value: configuration.inputs }),
      isCode: true,
    },
    { key: 'code', label: 'code', value: codeCell({ value: configuration.code }), isCode: true },
    {
      key: 'resources',
      label: 'resources',
      value: codeCell({ value: configuration.resources }),
      isCode: true,
    },
    { key: 'meta', label: 'meta', value: codeCell({ value: configuration.meta }), isCode: true },
  ];

  const columns: Array<SimpleColumn<ConfigRow>> = [
    {
      id: 'label',
      header: '',
      width: { width: 100 },
      autoHeight: true,
      renderCell: (row) => (
        <div className="px-3 py-2 text-base font-semibold text-neutral-700 uppercase whitespace-nowrap">
          {row.label}
        </div>
      ),
    },
    {
      id: 'value',
      header: '',
      width: { flex: 1, minWidth: 200 },
      autoHeight: true,
      wrapText: true,
      renderCell: (row) => (
        <div
          className={cn(
            'w-full min-w-0 px-3 py-2 text-base text-neutral-800 whitespace-normal wrap-break-word',
            row.isCode && 'px-3 py-2'
          )}
        >
          {row.value}
        </div>
      ),
    },
  ];

  return (
    <div
      id="job-configuration"
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white px-4"
    >
      <SimpleGrid
        columns={columns}
        rows={rows}
        getRowId={(row) => row.key}
        hideHeader
        className="[&_.ag-cell]:border-b-neutral-200"
      />
    </div>
  );
}
