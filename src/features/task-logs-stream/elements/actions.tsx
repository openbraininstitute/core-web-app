'use client';

import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckLine,
  RiDownload2Line,
  RiFileCopyLine,
} from '@remixicon/react';
import { useMemo, useState } from 'react';

import {
  copyToClipboard,
  downloadAsFile,
  toJson,
  toTxt,
} from '@/features/task-logs-stream/helpers';
import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { ILogEntry, TLogsExportFormat } from '@/features/task-logs-stream/types';

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
  const [isCopySuccess, setIsCopySuccess] = useState(false);
  const [copySelectResetKey, setCopySelectResetKey] = useState(0);
  const [downloadSelectResetKey, setDownloadSelectResetKey] = useState(0);

  const hasEntries = entries.length > 0;
  const hasQuery = query.trim().length > 0;
  const txtContent = useMemo(() => toTxt({ entries }), [entries]);
  const jsonContent = useMemo(() => toJson({ entries }), [entries]);

  const onCopy = async ({ format }: { format: TLogsExportFormat }) => {
    if (!hasEntries) return;
    const content = format === 'txt' ? txtContent : jsonContent;
    await copyToClipboard({ text: content });
    setIsCopySuccess(true);
    setTimeout(() => setIsCopySuccess(false), 1400);
  };

  const onDownload = ({ format }: { format: TLogsExportFormat }) => {
    if (!hasEntries) return;
    const content = format === 'txt' ? txtContent : jsonContent;
    downloadAsFile({
      filename: `task-logs.${format}`,
      content,
      mimeType: format === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8',
    });
  };

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="relative min-w-0 flex-1 py-1 px-1 rounded-full">
        <Input
          type="text"
          value={query}
          onChange={(event) => onQueryChange({ query: event.target.value })}
          disabled={searchDisabled}
          className={cn(
            'h-12 min-w-0 bg-white w-full rounded-full border border-neutral-300 pr-34 pl-5 text-base outline-none',
            'focus:border focus:border-primary-7'
          )}
          placeholder="Search logs"
          aria-label="Search logs"
        />
        {hasQuery && (
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1">
            <span className="text-xs text-neutral-600 tabular-nums select-none">
              {totalMatches === 0 ? '0/0' : `${activeMatchIndex + 1}/${totalMatches}`}
            </span>
            <button
              type="button"
              onClick={onGoToPreviousMatch}
              disabled={searchDisabled || totalMatches === 0}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300',
                'text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50'
              )}
              aria-label="Previous highlighted match"
            >
              <RiArrowUpSLine className="size-4" />
            </button>
            <button
              type="button"
              onClick={onGoToNextMatch}
              disabled={searchDisabled || totalMatches === 0}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300',
                'text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50'
              )}
              aria-label="Next highlighted match"
            >
              <RiArrowDownSLine className="size-4" />
            </button>
          </div>
        )}
      </div>
      <Select
        key={`copy-${copySelectResetKey}`}
        onValueChange={(value: TLogsExportFormat) => {
          void onCopy({ format: value });
          setCopySelectResetKey((prev) => prev + 1);
        }}
        disabled={!hasEntries}
      >
        <SelectTrigger
          className={cn(
            'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
            'h-12 w-fit rounded-full border border-neutral-300 px-5 text-base cursor-pointer bg-white shadow-bnb',
            'data-[size=default]:h-12 data-[size=sm]:h-12',
            "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold",
            { 'cursor-not-allowed opacity-50': !hasEntries },
            'hover:bg-gray-50'
          )}
        >
          <div className="flex items-center gap-2">
            {isCopySuccess ? (
              <RiCheckLine className="size-4" />
            ) : (
              <RiFileCopyLine className="size-4" />
            )}
            <SelectValue placeholder="Copy" />
          </div>
        </SelectTrigger>
        <SelectContent
          className="rounded-2xl border border-neutral-300 bg-white shadow-xl"
          side="bottom"
          sideOffset={0}
        >
          <SelectItem
            value="txt"
            className="text-primary-9 text-base font-bold cursor-pointer hover:rounded-3xl"
          >
            TXT
          </SelectItem>
          <SelectItem
            value="json"
            className="text-primary-9 text-base font-bold cursor-pointer hover:rounded-3xl"
          >
            JSON
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        key={`download-${downloadSelectResetKey}`}
        onValueChange={(value: TLogsExportFormat) => {
          onDownload({ format: value });
          setDownloadSelectResetKey((prev) => prev + 1);
        }}
        disabled={!hasEntries}
      >
        <SelectTrigger
          className={cn(
            'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
            'h-12 w-fit rounded-full border border-neutral-300 px-5 text-base cursor-pointer bg-white shadow-bnb',
            'data-[size=default]:h-12 data-[size=sm]:h-12',
            "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold",
            { 'cursor-not-allowed opacity-50': !hasEntries },
            'hover:bg-gray-50'
          )}
        >
          <div className="flex items-center gap-2">
            <RiDownload2Line className="size-4" />
            <SelectValue placeholder="Download" />
          </div>
        </SelectTrigger>
        <SelectContent
          className="rounded-2xl border border-neutral-300 bg-white shadow-xl"
          side="bottom"
          sideOffset={0}
        >
          <SelectItem
            value="txt"
            className={cn('text-primary-9 text-base font-bold cursor-pointer hover:rounded-3xl')}
          >
            TXT
          </SelectItem>
          <SelectItem
            value="json"
            className="text-primary-9 text-base font-bold cursor-pointer hover:rounded-3xl"
          >
            JSON
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
