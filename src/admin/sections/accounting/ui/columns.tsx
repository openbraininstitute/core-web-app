import { formatDateTime } from '../../../shared/format';
import { AdminLink } from '../../../shell/admin-link';
import { splitLedgers, TRANSACTION_LABELS } from '../helpers';
import { Credits, EnabledPill } from './cells';

import type { ISimpleColumn } from '@/features/data-grid/presets/simple-grid';
import type { TJournalEntry, TLedgerEntry, TVlabAccount } from '../types';

export function creditsColumn<Row>(
  id: string,
  header: string,
  amount: (row: Row) => string | undefined
): ISimpleColumn<Row> {
  return {
    id,
    header,
    width: { width: 140 },
    renderCell: (row) => <Credits amount={amount(row)} />,
  };
}

export function accountNameColumn<Row extends TVlabAccount>(header: string): ISimpleColumn<Row> {
  return {
    id: 'name',
    header,
    width: { flex: 3, minWidth: 240 },
    renderCell: (account) => (
      <span className="flex items-center gap-3">
        <span className="text-primary-9 truncate font-semibold">{account.name}</span>
        <EnabledPill enabled={account.enabled} />
      </span>
    ),
  };
}

export function createdColumn<Row extends { created_at: string }>(): ISimpleColumn<Row> {
  return {
    id: 'created_at',
    header: 'Created',
    width: { flex: 1, minWidth: 180 },
    getValue: (row) => formatDateTime(row.created_at),
  };
}

function LedgerAccounts({ ledgers }: { ledgers: TLedgerEntry[] }) {
  return (
    <span className="flex min-w-0 flex-col">
      {ledgers.map((ledger) => (
        <span key={ledger.id} className="truncate">
          <AdminLink kind="account" id={ledger.account_id} label={ledger.account_name} />
        </span>
      ))}
    </span>
  );
}

export const JOURNAL_COLUMNS: Array<ISimpleColumn<TJournalEntry>> = [
  {
    id: 'transaction_datetime',
    header: 'When',
    width: { width: 170 },
    getValue: (entry) => formatDateTime(entry.transaction_datetime),
  },
  {
    id: 'transaction_type',
    header: 'Type',
    width: { width: 190 },
    getValue: (entry) => TRANSACTION_LABELS[entry.transaction_type] ?? entry.transaction_type,
  },
  {
    id: 'from',
    header: 'From',
    width: { flex: 1, minWidth: 180 },
    renderCell: (entry) => <LedgerAccounts ledgers={splitLedgers(entry.ledgers).debited} />,
  },
  {
    id: 'to',
    header: 'To',
    width: { flex: 1, minWidth: 180 },
    renderCell: (entry) => <LedgerAccounts ledgers={splitLedgers(entry.ledgers).credited} />,
  },
  {
    id: 'amount',
    header: 'Amount',
    width: { width: 140 },
    renderCell: (entry) => (
      <span className="flex flex-col">
        {splitLedgers(entry.ledgers).credited.map((ledger) => (
          <Credits key={ledger.id} amount={ledger.amount} />
        ))}
      </span>
    ),
  },
  {
    id: 'job_id',
    header: 'Job',
    width: { width: 120 },
    renderCell: (entry) => <AdminLink kind="accountingJob" id={entry.job_id} />,
  },
];

export const journalRowId = (entry: TJournalEntry) => String(entry.id);
