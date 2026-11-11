import { RiPlayFill } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { NotebookProfile } from '@/services/notebooks';

const FALLBACK_PROFILE_LABEL = '2 CPU, 4 GB RAM';

/**
 * Credit multiplier per session size, shown next to the size letter. Mirrors
 * the per-instance_type weights the accounting service applies to billing
 * (see LONGRUN_INSTANCE_TYPE_WEIGHTS). Sizes absent here show no multiplier.
 */
const PROFILE_CREDIT_MULTIPLIER: Record<string, number> = {
  small: 1,
  medium: 2,
  large: 3,
  fullnode: 4,
};

/**
 * Split a profile description like "4 CPU, 16 GB RAM (dedicated node)" into its
 * size line and an optional parenthetical note, so the note can be shown as a
 * separate tag and each row stays on one line.
 */
function splitDescription(description: string | null): { size: string; note: string | null } {
  if (!description) return { size: '', note: null };
  const match = description.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (match) {
    const raw = match[2].trim();
    // Sentence-case for a consistent badge label regardless of backend casing.
    const note = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : null;
    return { size: match[1].trim(), note };
  }
  return { size: description.trim(), note: null };
}

/**
 * Scrollable size picker rendered in the run-button dropdown. Clicking a size
 * runs it. When the service lists no profiles, a single hardcoded default is
 * shown that runs with no explicit profile (backend applies its own default).
 */
export function SessionSizePanel({
  profiles,
  defaultProfile,
  onSelect,
}: {
  profiles: NotebookProfile[];
  defaultProfile: string | null;
  onSelect: (profileName?: string) => void;
}) {
  const hasProfiles = profiles.length > 0;

  return (
    <div className="w-60 rounded-md border border-neutral-200 bg-white p-2 shadow-xl">
      <p className="text-primary-8 mb-1.5 text-sm font-semibold">Choose session size</p>
      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
        {hasProfiles ? (
          profiles.map((profile) => {
            const isDefault = profile.name === defaultProfile;
            const title = profile.display_name ?? profile.name;
            const multiplier = PROFILE_CREDIT_MULTIPLIER[profile.name];
            // `description` is the authoritative size label; the structured
            // requests_* fields are k8s values that can differ from it.
            const { size, note } = splitDescription(profile.description);
            const button = (
              <button
                type="button"
                key={profile.name}
                data-testid={`notebook-profile-${profile.name}`}
                onClick={() => onSelect(profile.name)}
                className={cn(
                  'text-primary-8 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors',
                  isDefault
                    ? 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                    : 'border-neutral-200 hover:bg-neutral-100'
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2 font-semibold">
                    {title}
                    {isDefault && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-600">
                        Default
                      </span>
                    )}
                    {note && (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10.5px] font-medium text-green-700">
                        {note}
                      </span>
                    )}
                  </span>
                  {size && (
                    <span className="truncate text-xs whitespace-nowrap text-neutral-500">
                      {size}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {multiplier !== undefined && (
                    <span className="text-xs font-normal text-neutral-400">{multiplier}×</span>
                  )}
                  <RiPlayFill className="size-4 text-neutral-500" />
                </span>
              </button>
            );
            return button;
          })
        ) : (
          // No profiles from the service: run the backend default (no profile arg).
          <button
            type="button"
            data-testid="notebook-profile-default-fallback"
            onClick={() => onSelect(undefined)}
            className="text-primary-8 flex items-center justify-between gap-2 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-left transition-colors hover:bg-blue-100"
          >
            <span className="flex flex-col">
              <span className="flex items-center gap-2 font-semibold">
                {FALLBACK_PROFILE_LABEL}
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-600">
                  Default
                </span>
              </span>
            </span>
            <RiPlayFill className="size-4 shrink-0 text-neutral-500" />
          </button>
        )}
      </div>
    </div>
  );
}
