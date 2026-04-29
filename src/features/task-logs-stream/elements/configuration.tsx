'use client';

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';
import { Table } from 'antd';
import { useState } from 'react';

import { ActivityStatusColorMap } from '@/features/scan-config/constants';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { CodeBlock } from '@/ui/molecules/code-blocks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import type { ITaskLogsDataState } from '@/features/task-logs-stream/types';

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

function formatDurationMinutes({
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
  const minutes = durationMs / 60_000;
  return `${minutes.toFixed(2)} min`;
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
      <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
        Configuration details are not available for this task yet.
      </div>
    );
  }

  const statusKey = String(configuration.status ?? 'unknown').toLowerCase();
  const statusLabel = statusKey.toUpperCase();
  const statusColor =
    ActivityStatusColorMap[statusKey as keyof typeof ActivityStatusColorMap] ?? '#6b7280';
  const startTime = (configuration.start_time as string | null | undefined) ?? null;
  const endTime = (configuration.end_time as string | null | undefined) ?? null;
  const duration = formatDurationMinutes({ startTime, endTime });

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

  const rows: Array<{ key: string; label: string; value: ReactNode; isCode?: boolean }> = [
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

  const columns: ColumnsType<(typeof rows)[number]> = [
    {
      dataIndex: 'label',
      key: 'label',
      width: 100,
      render: (label: string) => (
        <div className="px-3 py-2 text-base font-semibold text-neutral-700 uppercase whitespace-nowrap">
          {label}
        </div>
      ),
    },
    {
      dataIndex: 'value',
      key: 'value',
      render: (value: ReactNode, row) => (
        <div
          className={cn(
            'w-full min-w-0 px-3 py-2 text-base text-neutral-800 whitespace-normal wrap-break-word',
            row.isCode && 'px-3 py-2'
          )}
        >
          {value}
        </div>
      ),
    },
  ];

  return (
    <div
      id="job-configuration"
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white px-4"
    >
      <Table
        tableLayout="fixed"
        className="[&_.ant-table]:bg-transparent [&_.ant-table-cell]:border-b-neutral-200 [&_.ant-table-cell]:align-top [&_.ant-table-tbody>tr:last-child>td]:border-b-0"
        columns={columns}
        dataSource={rows}
        pagination={false}
        showHeader={false}
        size="small"
        rowKey="key"
      />
    </div>
  );
}
