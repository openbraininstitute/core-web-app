'use client';

import { adminQueryKeys } from '../../../query-keys';
import { useDayRange } from '../../../shared/day';
import { AdminPagedGrid, pagedSource } from '../../../shared/grid';
import { PageHeader } from '../../../shared/page-header';
import { listJournal } from '../api';
import { dayBounds, TRANSACTION_LABELS } from '../helpers';
import { AccountingFilter, TransactionType } from '../types';
import { JOURNAL_COLUMNS, journalRowId } from './columns';
import { useIdFilter, useOptionFilter } from './filters';

import type { TJournalEntry, TJournalFilters, TTransactionType } from '../types';

const JOURNAL_SOURCE = pagedSource(listJournal);

const TYPE_OPTIONS = Object.values(TransactionType).map((value: TTransactionType) => ({
  value,
  label: TRANSACTION_LABELS[value],
}));

export function JournalList() {
  const account = useIdFilter(AccountingFilter.Account, 'Account');
  const job = useIdFilter(AccountingFilter.Job, 'Job');
  const type = useOptionFilter({
    key: 'type',
    placeholder: 'Any transaction',
    options: TYPE_OPTIONS,
  });
  const range = useDayRange();
  const bounds = dayBounds(range.from, range.to);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Journal">
        Every credit movement, newest first. An account filter matches either side.
      </PageHeader>
      <div className="flex flex-wrap items-center gap-3">
        {account.control}
        {job.control}
        {type.control}
        {range.control}
      </div>
      <AdminPagedGrid<TJournalEntry>
        fill
        what="journal entries"
        columns={JOURNAL_COLUMNS}
        getRowId={journalRowId}
        dataSource={JOURNAL_SOURCE}
        queryKey={adminQueryKeys.accountingJournal()}
        params={
          {
            account_id: account.id,
            job_id: job.id,
            transaction_type: type.value,
            transaction_after: bounds.after,
            transaction_before: bounds.before,
          } satisfies TJournalFilters
        }
      />
    </div>
  );
}
