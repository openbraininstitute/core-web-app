import { ExclamationCircleFilled } from '@ant-design/icons';
import { RiExternalLinkLine, RiPlayFill, RiStopCircleLine } from '@remixicon/react';
import { Button } from 'antd';
import { formatDistance } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import type { SessionPanelProps } from '@/features/notebooks/hooks/use-run-notebook';
import type { NotebookProfile, NotebookSession } from '@/services/notebooks';

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

function sizeLabel(session: NotebookSession, profiles: NotebookProfile[]): string | null {
  const profile = profiles.find((p) => p.name === session.profile);
  return profile?.display_name ?? session.profile;
}

/** Current time, refreshed so relative times such as "Started 5 minutes ago" keep moving. */
function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const sessionTitle = (session: NotebookSession) => `Session ${(session.session_number ?? 0) + 1}`;

/**
 * Confirmation shown on top of the panel itself rather than as a page modal: a
 * page modal renders outside the dropdown, and clicking it would close the list.
 */
function StopSessionDialog({
  session,
  size,
  onCancel,
  onConfirm,
}: {
  session: NotebookSession;
  size: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const title = sessionTitle(session);

  useEffect(() => confirmRef.current?.focus(), []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click cancels, the dialog has its own buttons
    <div
      data-testid="notebook-stop-dialog-backdrop"
      className="absolute inset-0 z-10 grid place-items-center rounded-md bg-black/35"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notebook-stop-dialog-title"
        data-testid="notebook-stop-dialog"
        className="w-64 rounded-lg bg-white p-3 shadow-[0_6px_16px_0_rgba(0,0,0,0.08),0_3px_6px_-4px_rgba(0,0,0,0.12),0_9px_28px_8px_rgba(0,0,0,0.05)]"
      >
        <div className="mb-3">
          <h3
            id="notebook-stop-dialog-title"
            className="text-primary-8 flex items-center gap-2 text-lg font-bold"
          >
            <ExclamationCircleFilled aria-hidden className="shrink-0 text-base text-[#faad14]!" />
            <span>
              Stop &ldquo;{title}&rdquo;{size ? ` (${size})` : ''}?
            </span>
          </h3>
          <p className="text-primary-8 pl-6 text-sm font-light">
            Running kernels and unsaved changes will be lost.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            size="small"
            data-testid="notebook-stop-dialog-cancel"
            onClick={onCancel}
            className="min-w-20 rounded-full px-5"
          >
            Cancel
          </Button>
          <Button
            ref={confirmRef}
            size="small"
            type="primary"
            danger
            data-testid="notebook-stop-dialog-confirm"
            onClick={onConfirm}
            className="min-w-20 rounded-full px-5"
          >
            Stop
          </Button>
        </div>
      </div>
    </div>
  );
}

function SessionRow({
  session,
  profiles,
  stopping,
  now,
  onOpen,
  onStop,
}: {
  session: NotebookSession;
  profiles: NotebookProfile[];
  stopping: boolean;
  now: Date;
  onOpen: (sessionNumber: number) => void;
  onStop: (sessionNumber: number) => void;
}) {
  const number = session.session_number;
  const isSandbox = session.kind === 'sandbox';
  const starting = session.state === 'starting';
  const size = sizeLabel(session, profiles);
  const isStopping = stopping || session.state === 'stopping';
  const startedAgo = session.started_on
    ? formatDistance(new Date(session.started_on), now, { addSuffix: true })
    : null;

  return (
    <div
      data-testid={isSandbox ? 'notebook-session-sandbox' : `notebook-session-${number}`}
      className="text-primary-8 flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5"
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 font-semibold">
          {isSandbox ? 'Agent sandbox' : sessionTitle(session)}
          {size && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10.5px] font-medium text-blue-600">
              {size}
            </span>
          )}
        </span>
        <span className="truncate text-xs text-neutral-500">
          {isStopping
            ? 'Stopping…'
            : starting
              ? 'Starting…'
              : startedAgo
                ? `Started ${startedAgo}`
                : 'Running'}
        </span>
      </span>
      {!isSandbox && number !== null && (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="Attach to this session"
            data-testid={`notebook-session-open-${number}`}
            disabled={isStopping}
            onClick={() => onOpen(number)}
            className="flex items-center gap-1 rounded-md bg-primary-8 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-9 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Attach
            <RiExternalLinkLine className="size-3.5" />
          </button>
          <button
            type="button"
            title={starting ? 'Wait until the session has started' : 'Stop this session'}
            data-testid={`notebook-session-stop-${number}`}
            disabled={starting || isStopping}
            onClick={() => onStop(number)}
            className="rounded-md border border-neutral-300 p-1 text-neutral-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-neutral-300 disabled:hover:bg-transparent disabled:hover:text-neutral-600"
          >
            <RiStopCircleLine className="size-4" />
          </button>
        </span>
      )}
    </div>
  );
}

/**
 * Scrollable picker rendered in the run-button dropdown. When sessions are already
 * running they are listed first, to attach to one; picking a size starts a new
 * session. When the service lists no profiles, a single hardcoded default is
 * shown that runs with no explicit profile (backend applies its own default).
 */
export function SessionSizePanel({
  profiles,
  defaultProfile,
  onSelect,
  sessionPanel,
}: {
  profiles: NotebookProfile[];
  defaultProfile: string | null;
  onSelect: (profileName?: string) => void;
  sessionPanel?: SessionPanelProps;
}) {
  const hasProfiles = profiles.length > 0;
  const sessions = sessionPanel?.sessions ?? [];
  const notebookSessions = sessions.filter((session) => session.kind === 'notebook');
  const limitReached =
    sessionPanel?.maxSessions != null && notebookSessions.length >= sessionPanel.maxSessions;
  const [confirmStop, setConfirmStop] = useState<NotebookSession | null>(null);
  const now = useNow(30_000);

  return (
    <div className="relative w-72 rounded-md border border-neutral-200 bg-white p-2 shadow-xl">
      {sessionPanel && confirmStop && confirmStop.session_number !== null && (
        <StopSessionDialog
          session={confirmStop}
          size={sizeLabel(confirmStop, profiles)}
          onCancel={() => setConfirmStop(null)}
          onConfirm={() => {
            const sessionNumber = confirmStop.session_number;
            setConfirmStop(null);
            if (sessionNumber !== null) sessionPanel.onStopSession(sessionNumber);
          }}
        />
      )}
      {sessionPanel && sessions.length > 0 && (
        <div data-testid="notebook-running-sessions" className="mb-2">
          <p className="text-primary-8 mb-1.5 text-sm font-semibold">Attach to a running session</p>
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto pr-1">
            {sessions.map((session) => (
              <SessionRow
                key={`${session.kind}-${session.session_number ?? 'sandbox'}`}
                session={session}
                profiles={profiles}
                stopping={sessionPanel.stoppingSession === session.session_number}
                now={now}
                onOpen={sessionPanel.onOpenSession}
                onStop={() => setConfirmStop(session)}
              />
            ))}
          </div>
        </div>
      )}
      <p className="text-primary-8 mb-1.5 text-sm font-semibold">
        {sessions.length > 0 ? 'Or start a new session' : 'Choose session size'}
      </p>
      {limitReached && (
        <p data-testid="notebook-session-limit" className="mb-1.5 text-xs text-amber-600">
          You reached the limit of {sessionPanel?.maxSessions} concurrent sessions. Stop one to
          start a new one.
        </p>
      )}
      <div
        className={cn('flex max-h-56 flex-col gap-1 overflow-y-auto pr-1', {
          'pointer-events-none opacity-50': limitReached,
        })}
      >
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
