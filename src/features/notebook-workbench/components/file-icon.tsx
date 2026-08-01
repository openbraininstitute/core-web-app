'use client';

import {
  RiCodeSSlashLine,
  RiDatabase2Line,
  RiFile3Line,
  RiFileTextLine,
  RiFolderFill,
  RiImageLine,
  RiMarkdownLine,
  RiSettings4Line,
  RiTerminalBoxLine,
} from '@remixicon/react';

import { extension } from '@/features/notebook-workbench/paths';
import { cn } from '@/utils/css-class';

/** The notebook mark: a filled square with the Jupyter-style prompt brackets. */
function NotebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect x="1" y="1.5" width="14" height="13" rx="2.5" fill="currentColor" />
      <path
        d="M5.4 5.2 3.6 8l1.8 2.8M10.6 5.2 12.4 8l-1.8 2.8"
        stroke="white"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS: Record<string, { Icon: any; className: string }> = {
  py: { Icon: RiCodeSSlashLine, className: 'text-primary-6' },
  ipynb: { Icon: NotebookGlyph, className: 'text-warning' },
  md: { Icon: RiMarkdownLine, className: 'text-neutral-4' },
  markdown: { Icon: RiMarkdownLine, className: 'text-neutral-4' },
  json: { Icon: RiSettings4Line, className: 'text-neutral-4' },
  yaml: { Icon: RiSettings4Line, className: 'text-neutral-4' },
  yml: { Icon: RiSettings4Line, className: 'text-neutral-4' },
  toml: { Icon: RiSettings4Line, className: 'text-neutral-4' },
  csv: { Icon: RiDatabase2Line, className: 'text-accent-dark' },
  tsv: { Icon: RiDatabase2Line, className: 'text-accent-dark' },
  parquet: { Icon: RiDatabase2Line, className: 'text-accent-dark' },
  h5: { Icon: RiDatabase2Line, className: 'text-accent-dark' },
  sh: { Icon: RiTerminalBoxLine, className: 'text-neutral-5' },
  bash: { Icon: RiTerminalBoxLine, className: 'text-neutral-5' },
  txt: { Icon: RiFileTextLine, className: 'text-neutral-3' },
  log: { Icon: RiFileTextLine, className: 'text-neutral-3' },
  png: { Icon: RiImageLine, className: 'text-primary-4' },
  jpg: { Icon: RiImageLine, className: 'text-primary-4' },
  jpeg: { Icon: RiImageLine, className: 'text-primary-4' },
  gif: { Icon: RiImageLine, className: 'text-primary-4' },
  svg: { Icon: RiImageLine, className: 'text-primary-4' },
};

export function FileIcon({
  name,
  isDirectory,
  className,
}: {
  name: string;
  isDirectory?: boolean;
  className?: string;
}) {
  if (isDirectory) {
    return <RiFolderFill className={cn('text-primary-3 size-4', className)} />;
  }
  const entry = ICONS[extension(name)];
  const Icon = entry?.Icon ?? RiFile3Line;
  return <Icon className={cn('size-4', entry?.className ?? 'text-neutral-3', className)} />;
}
