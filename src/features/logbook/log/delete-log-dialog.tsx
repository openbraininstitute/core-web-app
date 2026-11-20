import { LogWriters } from '@/features/logbook/board/rail';
import { agoOf } from '@/features/logbook/helpers';
import { ConfirmDeleteDialog } from '@/features/logbook/ui/confirm-delete-dialog';
import { Icon } from '@/features/logbook/ui/icons';

import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { IProject } from '@/features/logbook/auth/session';
import type { IGoesWith } from '@/features/logbook/ui/confirm-delete-dialog';

const GOES: readonly IGoesWith[] = [
  { icon: 'notebook', text: 'Its pages, with all their text and history' },
  { icon: 'clock', text: 'Its activity and the list of who wrote in it' },
  { icon: 'sparkle', text: 'Agent runs and published versions' },
];

const dateOf = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export interface IDeleteLogDialogProps {
  readonly log: IResearchLog;
  readonly project: IProject;
  // Rejects with a reason the dialog shows; a 503 is safe to retry.
  readonly onDelete: () => Promise<unknown>;
  readonly onClose: () => void;
}

export function DeleteLogDialog({ log, project, onDelete, onClose }: IDeleteLogDialogProps) {
  return (
    <ConfirmDeleteDialog
      title="Delete this research log?"
      lead="It goes for good, for everyone in the project, people and agents alike. This cannot be undone."
      goes={GOES}
      button="Delete"
      failedText="The log was not deleted."
      onDelete={onDelete}
      onClose={onClose}
      ticket={
        <article className="relative overflow-hidden rounded-2xl border border-rule-soft bg-soft">
          <div className="flex flex-col gap-2 px-5 pt-4 pb-3.5">
            <div className="flex items-start gap-2">
              <h3 className="line-clamp-2 min-w-0 flex-1 text-[16px] leading-snug font-bold">
                {log.name}
              </h3>
              {log.authorized_public ? (
                <span className="inline-flex h-6 flex-none items-center gap-1 rounded-full bg-scope-public-bg px-2 text-[11px] font-bold text-scope-public-fg">
                  <Icon name="globe" size={12} stroke={2} />
                  Public
                </span>
              ) : null}
            </div>
            <p className="line-clamp-3 text-[13.5px] leading-[1.5] text-neutral-10">
              {log.description.trim().length > 0 ? log.description : 'No description.'}
            </p>
          </div>
          <div className="mx-5 border-t border-dashed border-neutral-2" />
          <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 px-5 pt-3 pb-4 text-[12.5px]">
            <dt className="flex items-center gap-1.5 text-neutral-4">
              <Icon name="calendar" size={13} stroke={2} />
              Created
            </dt>
            <dd className="m-0 min-w-0 truncate font-semibold">
              {dateOf(log.creation_date)}
              <span className="font-normal text-neutral-4"> by {log.created_by.pref_label}</span>
            </dd>
            <dt className="flex items-center gap-1.5 text-neutral-4">
              <Icon name="clock" size={13} stroke={2} />
              Updated
            </dt>
            <dd className="m-0 font-semibold">{agoOf(log.update_date)}</dd>
            <dt className="flex items-center gap-1.5 text-neutral-4">
              <Icon name="people" size={13} stroke={2} />
              Written by
            </dt>
            <dd className="m-0">
              <LogWriters project={project} log={log} />
            </dd>
          </dl>
        </article>
      }
    />
  );
}
