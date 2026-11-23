'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { FormModal } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { closesDialog } from '../helpers';

import type { ReactNode } from 'react';
import type { TAction } from '../types';

export function DialogButton({
  label,
  variant = 'outline',
  children,
}: {
  label: string;
  variant?: TAction<never, never>['buttonVariant'];
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button rounded variant={variant} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      {open && children(() => setOpen(false))}
    </>
  );
}

function ActionModal<Values extends Record<string, unknown>, Result>({
  action,
  onClose,
}: {
  action: TAction<Values, Result>;
  onClose: () => void;
}) {
  const write = useAdminWrite({
    refreshes: adminQueryKeys.accounting(),
    write: action.write,
    done: action.done,
    failed: action.failed,
    onSuccess: onClose,
  });

  return (
    <FormModal<Values>
      title={action.title}
      description={action.description}
      fields={action.fields ?? []}
      initialValues={action.initialValues}
      okText={action.okText}
      danger={action.danger}
      pending={write.isPending}
      onSubmit={(values) =>
        write.mutate(values, {
          onError: (error) => {
            if (closesDialog(error)) onClose();
          },
        })
      }
      onClose={onClose}
    />
  );
}

export function ActionButton<Values extends Record<string, unknown>, Result>({
  action,
}: {
  action: TAction<Values, Result>;
}) {
  return (
    <DialogButton
      label={action.label}
      variant={action.buttonVariant ?? (action.danger ? 'destructive' : 'outline')}
    >
      {(close) => <ActionModal action={action} onClose={close} />}
    </DialogButton>
  );
}
