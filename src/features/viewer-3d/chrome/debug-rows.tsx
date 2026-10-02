import { RiDownload2Line, RiLoader4Line } from '@remixicon/react';

import type { ReactNode } from 'react';

export function fmt(n: number, digits = 0): string {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export const ms = (t: number | null | undefined, digits = 0) =>
  t == null ? '–' : `${fmt(t, digits)} ms`;

export function Lines({ lines }: { lines: ReactNode[] }) {
  return (
    <div className="flex flex-col gap-0.5 text-xs leading-snug tabular-nums [overflow-wrap:anywhere] [&_b]:font-semibold [&_b]:text-neutral-900">
      {lines.map((line, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the lines are rebuilt as a whole
        <div key={i}>{line}</div>
      ))}
    </div>
  );
}

/** A file to download, what it holds under its name; `busy` in place of the name while it is written. */
export function DownloadRow({
  label,
  detail,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  detail: string;
  busy: string | null;
  disabled: boolean;
  onClick(): void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-description={detail}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
    >
      {busy ? (
        <RiLoader4Line aria-hidden className="size-4 shrink-0 animate-spin" />
      ) : (
        <RiDownload2Line aria-hidden className="size-4 shrink-0" />
      )}
      <span className="flex flex-col">
        <span className="text-sm">{busy ?? label}</span>
        <span className="text-xs text-neutral-500">{detail}</span>
      </span>
    </button>
  );
}

/** `name` without what a file name cannot hold. */
export function fileName(name: string, fallback: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').trim() || fallback;
}
