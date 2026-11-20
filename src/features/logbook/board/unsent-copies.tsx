// On app start, send local page copies the server may lack; the sync code loads only here.
import { useQuery } from '@tanstack/react-query';

import { CopySync } from '@/features/logbook/types';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IUnsent, IUnsentCopiesProps } from '@/features/logbook/types';

async function syncAtStart(userId: string): Promise<IUnsent> {
  const [{ syncCopies, dropOthersCleanCopies }, { pageDocs }] = await Promise.all([
    import('@/features/logbook/collaboration/local-sync'),
    import('@/features/logbook/api/page-docs'),
  ]);
  const reports = await syncCopies(pageDocs, userId);
  await dropOthersCleanCopies(userId);
  const count = (...results: readonly string[]) =>
    reports.filter((report) => results.includes(report.result)).length;
  return { failed: count(CopySync.Failed), lost: count(CopySync.Gone, CopySync.Refused) };
}

export function UnsentCopies({ userId, enabled }: IUnsentCopiesProps) {
  const unsent = useQuery({
    queryKey: keyBuilderLogbook.unsentCopies(userId),
    queryFn: () => syncAtStart(userId),
    enabled,
    // Once per app start; "Try again" runs it again.
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const { failed, lost } = unsent.data ?? { failed: 0, lost: 0 };
  if (failed === 0 && lost === 0) return null;
  return (
    <div
      className="mb-3 flex items-center gap-3 rounded-[12px] border border-rule bg-white p-[10px_14px] text-[13px] text-neutral-7"
      role="alert"
    >
      <p className="flex-1">
        {failed > 0
          ? `${failed} page${failed === 1 ? ' has' : 's have'} changes on this device that are not on the server yet. They are kept here and sent at the next start. `
          : ''}
        {lost > 0
          ? `${lost} page${lost === 1 ? '' : 's'} with changes on this device can no longer be saved: deleted, or you lost write access. Their copy stays on this device.`
          : ''}
      </p>
      {failed > 0 ? (
        <button
          type="button"
          className="btn-navy"
          disabled={unsent.isFetching}
          onClick={() => void unsent.refetch()}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
