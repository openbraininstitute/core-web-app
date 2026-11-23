'use client';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/ui/molecules/button';

import { adminQueryKeys } from '../../../query-keys';
import { REQUIRED, typedNameField } from '../../../shared/form-modal';
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
import { ActionButton } from './action-button';

import type {
  TAccount,
  TAccountStatus,
  TAction,
  TDepleted,
  TAccountActionValues as TValues,
} from '../types';

const PROJECT_OPTIONS = { enabled: true, page: 1, page_size: 100 };

function MoveButton({ account, vlabId }: { account: TAccount; vlabId: string }) {
  const projects = useQuery({
    queryKey: adminQueryKeys.accountingProjectOptions(vlabId),
    queryFn: ({ signal }) => listProjectAccounts({ vlabId, ...PROJECT_OPTIONS }, signal),
  });
  const options = (projects.data?.data ?? [])
    .filter((project) => project.id !== account.id)
    .map((project) => ({ value: project.id, label: project.name }));
  if (projects.isPending) {
    return (
      <Button rounded variant="outline" size="sm" disabled>
        Move to a project
      </Button>
    );
  }
  if (projects.isError) {
    return <span className="text-destructive text-sm">Couldn't load the projects to move to</span>;
  }
  if (!options.length) return null;

  return (
    <ActionButton<TValues, null>
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
          moveBudget({ vlab_id: vlabId, debited_from: account.id, credited_to, amount }),
        done: 'Credits moved',
        failed: "Couldn't move the credits",
      }}
    />
  );
}

function statusAction(account: TAccount): TAction<TValues, TAccountStatus> {
  const enabling = !account.enabled;
  const verb = enabling ? 'Enable' : 'Disable';
  const what = account.account_type === AccountType.VirtualLab ? 'lab and its projects' : 'project';
  return {
    label: verb,
    title: `${verb} ${account.name}?`,
    description: enabling
      ? `Enables the ${what}, so jobs can be charged to it again.`
      : `Disables the ${what}. Jobs already running keep running, but nothing can be charged to it until it's enabled again. Credits can't be moved or depleted while it's disabled, so deplete it first if its credits should go.`,
    okText: verb,
    danger: !enabling,
    write: () => setAccountEnabled(account.id, { enabled: enabling }),
    done: describeStatusChange,
    failed: `Couldn't ${verb.toLowerCase()} the account`,
  };
}

function depleteAction(account: TAccount, isLab: boolean): TAction<TValues, TDepleted | null> {
  return {
    label: 'Deplete',
    title: `Deplete ${account.name}?`,
    description: `Moves every credit in ${isLab ? 'this lab and its enabled projects' : 'this project'} to the system account.${isLab ? ' Disabled projects keep theirs.' : ''} This can't be undone.`,
    fields: [typedNameField(account.name, 'account')],
    okText: 'Deplete',
    danger: true,
    write: () =>
      isLab ? depleteVlab({ vlab_id: account.id }) : depleteProject({ proj_id: account.id }),
    done: (result) => `Depleted ${result?.total_amount ?? 0} credits`,
    failed: "Couldn't deplete the account",
  };
}

const topUpAction = (account: TAccount): TAction<TValues> => ({
  label: 'Top up',
  title: `Top up ${account.name}`,
  description: 'Adds new credits to this lab from the system account.',
  fields: [amountField()],
  okText: 'Top up',
  write: ({ amount }) => topUp({ vlab_id: account.id, amount }),
  done: 'Lab topped up',
  failed: "Couldn't top up the lab",
});

function projectActions(account: TAccount, vlabId: string): TAction<TValues>[] {
  return [
    {
      label: 'Grant',
      title: `Grant credits to ${account.name}`,
      description: 'Tops up the lab and assigns the same amount to this project, in one step.',
      fields: [amountField()],
      okText: 'Grant',
      write: ({ amount }) => grantBudget({ proj_id: account.id, amount }),
      done: 'Credits granted',
      failed: "Couldn't grant the credits",
    },
    {
      label: 'Assign from lab',
      title: `Assign credits to ${account.name}`,
      description: "Moves credits from the lab's balance to this project.",
      fields: [amountField()],
      okText: 'Assign',
      write: ({ amount }) => assignBudget({ vlab_id: vlabId, proj_id: account.id, amount }),
      done: 'Credits assigned',
      failed: "Couldn't assign the credits",
    },
    {
      label: 'Return to lab',
      title: `Return credits from ${account.name}`,
      description: "Moves credits from this project back to the lab's balance.",
      fields: [amountField()],
      okText: 'Return',
      write: ({ amount }) => reverseBudget({ vlab_id: vlabId, proj_id: account.id, amount }),
      done: 'Credits returned to the lab',
      failed: "Couldn't return the credits",
    },
  ];
}

/** Budget moves and the account's state, for a lab or a project account. */
export function AccountActions({ account }: { account: TAccount }) {
  const isLab = account.account_type === AccountType.VirtualLab;
  const vlabId = account.account_type === AccountType.Project ? account.parent_id : null;
  if (!isLab && !vlabId) return null;
  if (!account.enabled) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ActionButton action={statusAction(account)} />
        <span className="text-neutral-4 text-sm">Credits move only on an enabled account.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isLab && <ActionButton action={topUpAction(account)} />}
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
