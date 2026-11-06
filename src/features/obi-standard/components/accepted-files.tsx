import { FileBadge } from './file-badge';

import type { StdFileGroup } from '../types';

/** Renders the files an entity type accepts, grouped by asset label. */
export function AcceptedFiles({ groups }: { groups: StdFileGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="border-neutral-2 rounded-xl border bg-white p-4 text-sm text-neutral-4">
        This entity type does not define any file assets. Its data lives entirely in its properties
        and in the entities it links to — there are no governed file slots to upload.
      </div>
    );
  }

  return (
    <div className="border-neutral-2 divide-neutral-2 divide-y overflow-hidden rounded-xl border bg-white">
      {groups.map((group) => (
        <div key={group.label} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="border-neutral-2 bg-neutral-1 rounded border px-1.5 py-0.5 font-mono text-xs text-neutral-7">
              {group.label}
            </code>
            {group.variants.length > 1 ? (
              <span className="text-xs text-label">{group.variants.length} accepted formats</span>
            ) : null}
          </div>
          <ul className="mt-3 space-y-2.5">
            {group.variants.map((v) => (
              <li
                key={v.contentType ?? 'directory'}
                className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3"
              >
                <div className="shrink-0 sm:w-28">
                  <FileBadge
                    contentType={v.contentType}
                    mime={v.mime}
                    suffixes={v.suffixes}
                    isDirectory={v.isDirectory}
                  />
                </div>
                <p className="text-sm leading-relaxed text-neutral-5">{v.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
