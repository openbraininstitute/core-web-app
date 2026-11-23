'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { FormModal, REQUIRED, typedNameField } from '../../../shared/form-modal';
import { useAdminWrite } from '../../../shared/use-admin-write';
import {
  assignBudget,
  depleteProject,
  depleteVlab,
  grantBudget,
  listProjectAccounts,
  moveBudget,
  reverseBudget,
  setAccountEnabled,
  topUp,
} from '../api';
import { amountField, describeStatusChange } from '../helpers';
import { AccountType } from '../types';

import type { ReactNode } from 'react';
import type { FormModalField } from '../../../shared/form-modal';
import type { TAccount } from '../types';

type TValues = { amount: string; credited_to: string; name: string };

/** `write` resolves to the message shown once it's done. */
type TAction = {
  label: string;
  title: string;
  description: ReactNode;
  fields?: FormModalField[];
  okText: string;
  danger?: boolean;
  write: (values: TValues) => Promise<string>;
  failed: string;
};

function ActionButton({ action }: { action: TAction }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const write = useAdminWrite({
    refreshes: adminQueryKeys.accounting(),
    write: action.write,
    done: (message) => message,
    failed: action.failed,
    onSuccess: close,
  });

  return (
    <>
      <Button
        rounded
        variant={action.danger ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {action.label}
      </Button>
      {open && (
        <FormModal<TValues>
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

const PROJECT_OPTIONS_PAGE = { page: 1, page_size: 100 };

function MoveButton({ account, vlabId }: { account: TAccount; vlabId: string }) {
  const projects = useQuery({
    queryKey: adminQueryKeys.accountingProjectOptions(vlabId),
    queryFn: ({ signal }) => listProjectAccounts({ vlabId, ...PROJECT_OPTIONS_PAGE }, signal),
  });
  const options = (projects.data?.data ?? [])
    .filter((project) => project.id !== account.id)
    .map((project) => ({ value: project.id, label: project.name }));
  if (!options.length) return null;

  return (
    <ActionButton
      action={{
        label: 'Move to a project',
        title: `Move credits from ${account.name}`,
        description: 'Moves credits from this project to another project of the same lab.',
        fields: [
          { name: 'credited_to', label: 'To project', kind: 'select', options, rules: [REQUIRED] },
          amountField(),
        ],
        okText: 'Move',
        write: ({ credited_to, amount }) =>
          moveBudget({ vlab_id: vlabId, debited_from: account.id, credited_to, amount }).then(
            () => 'Credits moved'
          ),
        failed: "Couldn't move the credits",
      }}
    />
  );
}

function statusAction(account: TAccount): TAction {
  const enabling = !account.enabled;
  const verb = enabling ? 'Enable' : 'Disable';
  const what = account.account_type === AccountType.VirtualLab ? 'lab and its projects' : 'project';
  return {
    label: verb,
    title: `${verb} ${account.name}?`,
    description: enabling
      ? `Enables the ${what}, so jobs can be charged to it again.`
      : `Disables the ${what}. Jobs already running keep running, but nothing can be charged to it until it's enabled again.`,
    okText: verb,
    danger: !enabling,
    write: () => setAccountEnabled(account.id, { enabled: enabling }).then(describeStatusChange),
    failed: `Couldn't ${verb.toLowerCase()} the account`,
  };
}

function depleteAction(account: TAccount, isLab: boolean): TAction {
  const deplete = () =>
    isLab ? depleteVlab({ vlab_id: account.id }) : depleteProject({ proj_id: account.id });
  return {
    label: 'Deplete',
    title: `Deplete ${account.name}?`,
    description: `Moves every credit in ${isLab ? 'this lab and all its projects' : 'this project'} to the system account. This can't be undone.`,
    fields: [typedNameField(account.name, 'account')],
    okText: 'Deplete',
    danger: true,
    write: () => deplete().then((result) => `Depleted ${result?.total_amount ?? 0} credits`),
    failed: "Couldn't deplete the account",
  };
}

function labActions(account: TAccount): TAction[] {
  return [
    {
      label: 'Top up',
      title: `Top up ${account.name}`,
      description: 'Adds new credits to this lab from the system account.',
      fields: [amountField()],
      okText: 'Top up',
      write: ({ amount }) => topUp({ vlab_id: account.id, amount }).then(() => 'Lab topped up'),
      failed: "Couldn't top up the lab",
    },
  ];
}

function projectActions(account: TAccount, vlabId: string): TAction[] {
  return [
    {
      label: 'Grant',
      title: `Grant credits to ${account.name}`,
      description: 'Tops up the lab and assigns the same amount to this project, in one step.',
      fields: [amountField()],
      okText: 'Grant',
      write: ({ amount }) =>
        grantBudget({ proj_id: account.id, amount }).then(() => 'Credits granted'),
      failed: "Couldn't grant the credits",
    },
    {
      label: 'Assign from lab',
      title: `Assign credits to ${account.name}`,
      description: "Moves credits from the lab's balance to this project.",
      fields: [amountField()],
      okText: 'Assign',
      write: ({ amount }) =>
        assignBudget({ vlab_id: vlabId, proj_id: account.id, amount }).then(
          () => 'Credits assigned'
        ),
      failed: "Couldn't assign the credits",
    },
    {
      label: 'Return to lab',
      title: `Return credits from ${account.name}`,
      description: "Moves credits from this project back to the lab's balance.",
      fields: [amountField()],
      okText: 'Return',
      write: ({ amount }) =>
        reverseBudget({ vlab_id: vlabId, proj_id: account.id, amount }).then(
          () => 'Credits returned to the lab'
        ),
      failed: "Couldn't return the credits",
    },
  ];
}

/** Budget moves and the account's state, for a lab or a project account. */
export function AccountActions({ account }: { account: TAccount }) {
  const isLab = account.account_type === AccountType.VirtualLab;
  const vlabId = account.account_type === AccountType.Project ? account.parent_id : null;
  if (!isLab && !vlabId) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {isLab &&
        labActions(account).map((action) => <ActionButton key={action.label} action={action} />)}
      {vlabId &&
        projectActions(account, vlabId).map((action) => (
          <ActionButton key={action.label} action={action} />
        ))}
      {vlabId && <MoveButton account={account} vlabId={vlabId} />}
      <ActionButton action={statusAction(account)} />
      <ActionButton action={depleteAction(account, isLab)} />
    </div>
  );
}
