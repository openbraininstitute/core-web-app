'use client';

import { useMemo, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';

import type { ILogEntry } from '@/features/task-logs-stream/logs-viewer';

interface IProps {
  entries: ILogEntry[];
  query: string;
  onQueryChange: (params: { query: string }) => void;
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

export function LogsActions({ entries, query, onQueryChange }: IProps) {
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
    <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange({ query: event.target.value })}
          className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-primary-7"
          placeholder="Search logs (token search)"
          aria-label="Search logs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!hasEntries}
              className="h-9 rounded-lg border border-neutral-300 px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Copy logs
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => void onCopy({ format: 'txt' })}>TXT</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void onCopy({ format: 'json' })}>
              JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!hasEntries}
              className="h-9 rounded-lg border border-neutral-300 px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download logs
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={() => onDownload({ format: 'txt' })}>TXT</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDownload({ format: 'json' })}>
              JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {copyStatus && <span className="text-xs text-emerald-700">{copyStatus}</span>}
      </div>
    </div>
  );
}
