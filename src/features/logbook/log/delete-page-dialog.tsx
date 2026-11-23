import { Icon } from '@/ui/molecules/icon';
import { ConfirmDeleteDialog } from '@/ui/segments/confirm-delete-dialog';

import type { IDeletePageDialogProps } from '@/features/logbook/types';
import type { IGoesWith } from '@/ui/segments/confirm-delete-dialog';

const GOES: readonly IGoesWith[] = [
  { icon: 'page', text: 'Its text, its versions and its history' },
  { icon: 'upload', text: 'Its copy in the project (the synced page)' },
  { icon: 'people', text: 'Anyone on it now keeps what they see until they leave' },
];

export function DeletePageDialog({ page, logName, onDelete, onClose }: IDeletePageDialogProps) {
  return (
    <ConfirmDeleteDialog
      title="Delete this section?"
      lead="It goes for good, for everyone in the project, people and agents alike. The rest of the log stays. This cannot be undone."
      goes={GOES}
      button="Delete section"
      failedText="The section was not deleted."
      onDelete={onDelete}
      onClose={onClose}
      ticket={
        <article className="flex items-center gap-3 rounded-2xl border border-rule-soft bg-soft px-5 py-4">
          <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-white text-primary-9 shadow-block-btn">
            <Icon name="page" size={16} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[16px] leading-snug font-bold">{page.title}</span>
            <span className="truncate text-[12.5px] text-neutral-4">A section of {logName}</span>
          </span>
        </article>
      }
    />
  );
}
