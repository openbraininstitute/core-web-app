'use client';

import { CheckOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { LiveSave } from './use-live-autosave';
import type { LiveLog } from './use-live-log';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/**
 * How the shared text stands against what is saved on the platform: typing reaches everyone at
 * once, but only a save puts it where anyone else, or an agent, reads the log.
 */
export function SaveStatus({ save }: { save: LiveSave }) {
  const state = save.error
    ? {
        className: 'bg-red-50 text-red-700 ring-red-200',
        icon: <ExclamationCircleOutlined />,
        label: 'Not saved',
        hint: `The last save failed: ${save.error}`,
      }
    : save.saving
      ? {
          className: 'bg-neutral-1 text-primary-9 ring-neutral-2',
          icon: <LoadingOutlined />,
          label: 'Saving…',
          hint: 'Writing the text to the platform.',
        }
      : save.dirty
        ? {
            className: 'bg-amber-50 text-amber-800 ring-amber-200',
            icon: <span className="size-2 rounded-full bg-amber-500" />,
            label: 'Unsaved changes',
            hint: 'Everyone here sees them already. They are saved to the platform a few seconds after typing stops, or with Save & close.',
          }
        : {
            className: 'bg-green-50 text-green-700 ring-green-200',
            icon: <CheckOutlined />,
            label: save.savedAt ? `Saved ${timeLabel(save.savedAt)}` : 'Saved',
            hint: save.savedAt
              ? `Saved to the platform at ${timeLabel(save.savedAt)}${save.savedBy ? ` by ${save.savedBy}` : ''}.`
              : 'The platform has this text.',
          };
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <span
          role="status"
          className={cn(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ring-1',
            state.className
          )}
        >
          {state.icon}
          {state.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {state.hint}
      </TooltipContent>
    </Tooltip>
  );
}

/** Who has the log open (a ring for those editing), whether it is live, and how saving stands. */
export function LivePresence({ live, save }: { live: LiveLog; save: LiveSave }) {
  const status = !live.connected
    ? { dot: 'bg-amber-400', label: live.ready ? 'Reconnecting…' : 'Connecting…' }
    : { dot: 'bg-green-500', label: 'Live' };

  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="flex -space-x-2">
        {live.peers.map((peer) => (
          <Tooltip key={peer.clientId} delayDuration={150}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white',
                  peer.editing && 'ring-2 ring-offset-1'
                )}
                style={{ backgroundColor: peer.color, ['--tw-ring-color' as string]: peer.color }}
              >
                {peer.agent ? '✦' : initials(peer.name)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {peer.name}
              {peer.self ? ' (this tab)' : ''} · {peer.editing ? 'editing' : 'reading'}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>
          <span className="text-neutral-4 flex items-center gap-1.5 text-xs">
            <span className={cn('size-2 rounded-full', status.dot)} />
            {status.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {live.connected
            ? 'Typing reaches everyone with this log open as it happens.'
            : 'Edits made now reach the others once the connection is back.'}
        </TooltipContent>
      </Tooltip>
      {!live.readOnly && live.ready && <SaveStatus save={save} />}
    </div>
  );
}
