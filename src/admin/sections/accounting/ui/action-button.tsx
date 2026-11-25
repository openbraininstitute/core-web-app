'use client';

import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { FormModal } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';
import { closesDialog } from '../helpers';

import type { ReactNode } from 'react';
import type { AdminWriteOptions } from '../../../shared/use-admin-write';
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

/** A dialog's write; it closes once sending the form again would repeat what went through. */
export function useDialogWrite<Values, Result>(
  { write, done, failed }: AdminWriteOptions<Values, Result>,
  onClose: () => void
) {
  const mutation = useAdminWrite({
    refreshes: adminQueryKeys.accounting(),
    write,
    done,
    failed,
    onSuccess: onClose,
  });

  return {
    pending: mutation.isPending,
    send: (values: Values) =>
      mutation.mutate(values, {
        onError: (error) => {
          if (closesDialog(error)) onClose();
        },
      }),
  };
}

function ActionModal<Values extends Record<string, unknown>, Result>({
  action,
  onClose,
}: {
  action: TAction<Values, Result>;
  onClose: () => void;
}) {
  const { pending, send } = useDialogWrite(action, onClose);

  return (
    <FormModal<Values>
      title={action.title}
      description={action.description}
      fields={action.fields ?? []}
      initialValues={action.initialValues}
      okText={action.okText}
      danger={action.danger}
      pending={pending}
      onSubmit={send}
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
