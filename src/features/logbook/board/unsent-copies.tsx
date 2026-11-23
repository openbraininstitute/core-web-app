import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { CopySync } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { ConfirmDeleteDialog } from '@/ui/segments/confirm-delete-dialog';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IUnsent, IUnsentCopiesProps } from '@/features/logbook/types';
import type { IGoesWith } from '@/ui/segments/confirm-delete-dialog';

const NOTHING_UNSENT: IUnsent = { failed: 0, lost: [] };

const pagesOf = (count: number): string => `${count} page${count === 1 ? '' : 's'}`;

async function syncAtStart(userId: string): Promise<IUnsent> {
  const [{ syncCopies, dropOthersCleanCopies }, { pageDocs }] = await Promise.all([
    import('@/features/logbook/collaboration/local-sync'),
    import('@/features/logbook/api/page-docs'),
  ]);
  const reports = await syncCopies(pageDocs, userId);
  await dropOthersCleanCopies(userId);
  return {
    failed: reports.filter((report) => report.result === CopySync.Failed).length,
    lost: reports
      .filter((report) => report.result === CopySync.Gone || report.result === CopySync.Refused)
      .map((report) => report.name),
  };
}

async function discard(names: readonly string[]): Promise<void> {
  const { dropCopies } = await import('@/features/logbook/collaboration/local-sync');
  await dropCopies(names);
}

export function UnsentCopies({ userId, enabled }: IUnsentCopiesProps) {
  const unsent = useQuery({
    queryKey: keyBuilderLogbook.unsentCopies(userId),
    queryFn: () => syncAtStart(userId),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const [discarding, setDiscarding] = useState(false);
  const { failed, lost } = unsent.data ?? NOTHING_UNSENT;
  if (failed === 0 && lost.length === 0) return null;
  const goes: readonly IGoesWith[] = [
    { icon: 'page', text: `The unsaved changes of ${pagesOf(lost.length)} on this device` },
  ];
  return (
    <div
      className="mb-3 flex items-center gap-3 rounded-[12px] border border-rule bg-white p-[10px_14px] text-[13px] text-neutral-7"
      role="alert"
    >
      <p className="flex-1">
        {failed > 0
          ? `${failed} page${failed === 1 ? ' has' : 's have'} changes on this device that are not on the server yet. They are kept here and sent at the next start. `
          : ''}
        {lost.length > 0
          ? `${pagesOf(lost.length)} with changes on this device can no longer be saved: deleted, or you lost write access. Their copy stays on this device until you discard it.`
          : ''}
      </p>
      {failed > 0 ? (
        <button
          type="button"
          className="logbook-btn-navy"
          disabled={unsent.isFetching}
          onClick={() => void unsent.refetch()}
        >
          Try again
        </button>
      ) : null}
      {lost.length > 0 ? (
        <button
          type="button"
          className="logbook-btn-navy"
          disabled={unsent.isFetching}
          onClick={() => setDiscarding(true)}
        >
          Discard
        </button>
      ) : null}
      {discarding ? (
        <ConfirmDeleteDialog
          title="Discard the unsaved changes?"
          lead="They were never saved on the server, and they can no longer be: the page is deleted or you lost write access. Discarding removes them from this device. This cannot be undone."
          goes={goes}
          button="Discard changes"
          failedText="The changes were not discarded."
          onDelete={async () => {
            await discard(lost);
            await unsent.refetch();
          }}
          onClose={() => setDiscarding(false)}
          ticket={
            <article className="flex items-center gap-3 rounded-2xl border border-rule-soft bg-soft px-5 py-4">
              <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-white text-primary-9 shadow-block-btn">
                <Icon name="page" size={16} />
              </span>
              <span className="truncate text-[16px] leading-snug font-bold">
                {pagesOf(lost.length)} on this device
              </span>
            </article>
          }
        />
      ) : null}
    </div>
  );
}
