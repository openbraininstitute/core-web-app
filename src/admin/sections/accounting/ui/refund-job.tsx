'use client';

import { REQUIRED } from '../../../shared/form-modal';
import { refundJob } from '../api';
import { amountField } from '../helpers';
import { REASON_MAX_LENGTH } from '../schemas';
import { ActionButton } from './action-button';

import type { TAccountingJobDetail, TRefund, TRefundValues } from '../types';

/** Only a finished or cancelled job can be refunded, and accounting checks the rest. */
export function RefundJob({ job }: { job: TAccountingJobDetail }) {
  if (!job.finished_at && !job.cancelled_at) return null;
  if (Number(job.total_charged) <= Number(job.total_refunded)) return null;

  return (
    <ActionButton<TRefundValues, TRefund | null>
      action={{
        label: 'Refund',
        title: 'Refund this job?',
        description: `Moves credits from the system account back to the project. It has been charged ${job.total_charged} and refunded ${job.total_refunded} so far. A refund can't be undone.`,
        fields: [
          amountField({
            optional: true,
            extra: 'Leave it empty to refund everything not refunded yet.',
          }),
          {
            name: 'reason',
            label: 'Reason',
            kind: 'multiline',
            extra: 'Kept in the journal with the refund.',
            rules: [
              { ...REQUIRED, whitespace: true, message: 'Give a reason' },
              { max: REASON_MAX_LENGTH },
            ],
          },
        ],
        okText: 'Refund',
        danger: true,
        buttonVariant: 'outline',
        write: ({ amount, reason }) =>
          refundJob({ job_id: job.id, amount: amount || undefined, reason }),
        done: (result) => (result ? `Refunded ${result.amount} credits` : 'Job refunded'),
        failed: "Couldn't refund the job",
      }}
    />
  );
}
