'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { FormModal } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';

import type { TAction } from '../types';

export function ActionButton<Values extends Record<string, unknown>, Result>({
  action,
}: {
  action: TAction<Values, Result>;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const write = useAdminWrite({
    refreshes: adminQueryKeys.accounting(),
    write: action.write,
    done: action.done,
    failed: action.failed,
    onSuccess: close,
  });

  return (
    <>
      <Button
        rounded
        variant={action.buttonVariant ?? (action.danger ? 'destructive' : 'outline')}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {action.label}
      </Button>
      {open && (
        <FormModal<Values>
          title={action.title}
          description={action.description}
          fields={action.fields ?? []}
          okText={action.okText}
          danger={action.danger}
          pending={write.isPending}
          onSubmit={(values) => write.mutate(values)}
          onClose={close}
        />
      )}
    </>
  );
}
