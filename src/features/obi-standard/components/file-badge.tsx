import { cn } from '@/utils/css-class';

import { contentFamily, FAMILY_BADGE } from '../ui';

type Props = {
  contentType: string | null;
  mime: string | null;
  suffixes: string[];
  isDirectory: boolean;
};

/** Compact, colour-coded badge for an accepted file format. */
export function FileBadge({ contentType, mime, suffixes, isDirectory }: Props) {
  const family = contentFamily(contentType, isDirectory);
  const label = isDirectory
    ? 'directory'
    : (suffixes[0] ?? (contentType ? `.${contentType}` : 'file'));
  const title = isDirectory
    ? 'A directory of files'
    : [mime, suffixes.join(', ')].filter(Boolean).join('  ·  ');

  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-xs',
        FAMILY_BADGE[family]
      )}
    >
      {isDirectory ? (
        <svg
          viewBox="0 0 24 24"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      ) : null}
      {label}
    </span>
  );
}
