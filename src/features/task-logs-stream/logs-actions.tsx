'use client';

import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiDownload2Line,
  RiFileCopyLine,
} from '@remixicon/react';
import { useMemo, useState } from 'react';

import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { ILogEntry } from '@/features/task-logs-stream/types';

interface IProps {
  entries: ILogEntry[];
  query: string;
  onQueryChange: (params: { query: string }) => void;
  searchDisabled?: boolean;
  totalMatches: number;
  activeMatchIndex: number;
  onGoToPreviousMatch: () => void;
  onGoToNextMatch: () => void;
}

function toTxt({ entries }: { entries: ILogEntry[] }) {
  return entries
    .map(
      (entry) =>
        `${entry.timestampGroupLabel} [${entry.type.toUpperCase()}] ${entry.message.replaceAll('\n', ' ')}`
    )
    .join('\n');
}

function toJson({ entries }: { entries: ILogEntry[] }) {
  return JSON.stringify(entries, null, 2);
}

async function copyToClipboard({ text }: { text: string }) {
  await navigator.clipboard.writeText(text);
}

function downloadAsFile({
  filename,
  content,
  mimeType,
}: {
  filename: string;
  content: string;
  mimeType: string;
}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LogsActions({
  entries,
  query,
  onQueryChange,
  searchDisabled = false,
  totalMatches,
  activeMatchIndex,
  onGoToPreviousMatch,
  onGoToNextMatch,
}: IProps) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const hasEntries = entries.length > 0;
  const txtContent = useMemo(() => toTxt({ entries }), [entries]);
  const jsonContent = useMemo(() => toJson({ entries }), [entries]);

  const onCopy = async ({ format }: { format: 'txt' | 'json' }) => {
    if (!hasEntries) return;
    const content = format === 'txt' ? txtContent : jsonContent;
    await copyToClipboard({ text: content });
    setCopyStatus(`Copied ${format.toUpperCase()}`);
    setTimeout(() => setCopyStatus(null), 1400);
  };

  const onDownload = ({ format }: { format: 'txt' | 'json' }) => {
    if (!hasEntries) return;
    const content = format === 'txt' ? txtContent : jsonContent;
    downloadAsFile({
      filename: `task-logs.${format}`,
      content,
      mimeType: format === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
  };

  return (
    <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-md">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            type="text"
            value={query}
            onChange={(event) => onQueryChange({ query: event.target.value })}
            disabled={searchDisabled}
            className="h-12 min-w-0 w-full rounded-full border border-neutral-300 pr-34 pl-5 text-base outline-none focus:border-primary-7"
            placeholder="Search logs"
            aria-label="Search logs"
          />
          <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
            <span className="text-xs text-neutral-600 tabular-nums">
              {totalMatches === 0 ? '0/0' : `${activeMatchIndex + 1}/${totalMatches}`}
            </span>
            <button
              type="button"
              onClick={onGoToPreviousMatch}
              disabled={searchDisabled || totalMatches === 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous highlighted match"
            >
              <RiArrowUpSLine className="size-4" />
            </button>
            <button
              type="button"
              onClick={onGoToNextMatch}
              disabled={searchDisabled || totalMatches === 0}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next highlighted match"
            >
              <RiArrowDownSLine className="size-4" />
            </button>
          </div>
        </div>
        <Select
          onValueChange={(value: 'txt' | 'json') => {
            void onCopy({ format: value });
          }}
          disabled={!hasEntries}
        >
          <SelectTrigger
            className={cn(
              'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
              'h-12 w-fit rounded-full border border-neutral-300 px-5 text-base cursor-pointer',
              'data-[size=default]:h-12 data-[size=sm]:h-12',
              "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold",
              !hasEntries && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-center gap-2">
              <RiFileCopyLine className="size-4" />
              <SelectValue placeholder="Copy" />
            </div>
          </SelectTrigger>
          <SelectContent
            className="rounded-lg border border-neutral-300 bg-white shadow-xl"
            side="bottom"
            sideOffset={3}
          >
            <SelectItem value="txt" className="text-primary-9 text-base font-bold cursor-pointer">
              TXT
            </SelectItem>
            <SelectItem value="json" className="text-primary-9 text-base font-bold cursor-pointer">
              JSON
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(value: 'txt' | 'json') => {
            onDownload({ format: value });
          }}
          disabled={!hasEntries}
        >
          <SelectTrigger
            className={cn(
              'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
              'h-12 w-fit rounded-full border border-neutral-300 px-5 text-base cursor-pointer',
              'data-[size=default]:h-12 data-[size=sm]:h-12',
              "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold",
              !hasEntries && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-center gap-2">
              <RiDownload2Line className="size-4" />
              <SelectValue placeholder="Download" />
            </div>
          </SelectTrigger>
          <SelectContent
            className="rounded-lg border border-neutral-300 bg-white shadow-xl"
            side="bottom"
            sideOffset={3}
          >
            <SelectItem value="txt" className="text-primary-9 text-base font-bold cursor-pointer">
              TXT
            </SelectItem>
            <SelectItem value="json" className="text-primary-9 text-base font-bold cursor-pointer">
              JSON
            </SelectItem>
          </SelectContent>
        </Select>
        {copyStatus && <span className="text-xs text-emerald-700">{copyStatus}</span>}
      </div>
    </div>
  );
}
