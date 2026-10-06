import { RiBugLine, RiDownload2Line, RiLoader4Line } from '@remixicon/react';

import { ChromeMenu } from '@/features/scan-config/components/color-by/chrome-menu';

import type { ReactNode } from 'react';

/** A viewer's Debug menu: what it shows and its controls scroll, and the downloads stay in view under them. */
export function DebugMenuShell({
  testId,
  body,
  footer,
}: {
  testId: string;
  body: ReactNode;
  /** The downloads, given the way to close the menu. */
  footer(close: () => void): ReactNode;
}) {
  return (
    <ChromeMenu
      label="Debug"
      openLabel="Close debug"
      testId={testId}
      icon={<RiBugLine className="size-4 shrink-0" />}
      contentClassName="w-80 p-0"
    >
      {(close) => (
        <div className="flex max-h-[min(50rem,calc(100vh-6rem))] flex-col">
          <div className="min-h-0 overflow-y-auto">{body}</div>
          <div className="flex shrink-0 flex-col gap-1 border-t border-neutral-200 p-2 text-neutral-700">
            {footer(close)}
          </div>
        </div>
      )}
    </ChromeMenu>
  );
}

/** Why a download failed. */
export function FailedNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 px-2 text-xs text-error">
      {children}
    </p>
  );
}

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
