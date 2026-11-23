'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { FormModal } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { refundJob } from '../api';
import { amountField } from '../helpers';
import { REASON_MAX_LENGTH } from '../schemas';

import type { TAccountingJobDetail } from '../types';

type TValues = { amount?: string | null; reason: string };

/** Only a finished or cancelled job can be refunded, and accounting checks the rest. */
export function RefundJob({ job }: { job: TAccountingJobDetail }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const refund = useAdminWrite({
    refreshes: adminQueryKeys.accounting(),
    write: ({ amount, reason }: TValues) =>
      refundJob({ job_id: job.id, amount: amount || undefined, reason }),
    done: (result) => `Refunded ${result.amount} credits`,
    failed: "Couldn't refund the job",
    onSuccess: close,
  });
  if (!job.finished_at && !job.cancelled_at) return null;

  return (
    <>
      <Button rounded variant="outline" size="sm" onClick={() => setOpen(true)}>
        Refund
      </Button>
      {open && (
        <FormModal<TValues>
          title="Refund this job?"
          description={`Moves credits from the system account back to the project. It has been charged ${job.total_charged} and refunded ${job.total_refunded} so far. A refund can't be undone.`}
          fields={[
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
                { required: true, whitespace: true, message: 'Give a reason' },
                { max: REASON_MAX_LENGTH },
              ],
            },
          ]}
          okText="Refund"
          danger
          pending={refund.isPending}
          onSubmit={(values) => refund.mutate(values)}
          onClose={close}
        />
      )}
    </>
  );
}
