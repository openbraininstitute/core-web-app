import { useIssueLines } from '@/features/scan-config/use-config-store';

import type { TIssueLine } from '@/features/scan-config/issues';
import type { ConfigSchema } from '@/features/scan-config/types';

export type TIssueTarget = Pick<TIssueLine, 'rootElement' | 'entry' | 'field'>;

/** What stops the form from being generated, one line per issue; a line opens its field. */
export function IssueList({
  schema,
  onOpen,
}: {
  schema: ConfigSchema;
  onOpen: (target: TIssueTarget) => void;
}) {
  const lines = useIssueLines(schema);

  if (lines.length === 0) return null;

  return (
    <ul
      aria-label="Issues to fix"
      data-testid="scan-config-issue-list"
      className="mb-2 flex max-h-28 flex-col gap-1 overflow-y-auto text-xs"
    >
      {lines.map((line) => (
        <li key={line.path}>
          <button
            type="button"
            className="text-destructive w-full cursor-pointer text-left hover:underline"
            onClick={() =>
              onOpen({ rootElement: line.rootElement, entry: line.entry, field: line.field })
            }
          >
            {line.title}. {line.message}
          </button>
        </li>
      ))}
    </ul>
  );
}
