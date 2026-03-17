'use client';

import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Select } from 'antd';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { CoinsIcon } from '@/components/icons/buttons';
import { useAppNotification } from '@/components/notification';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { assignProjectBudget, reverseProjectBudget } from '@/services/virtual-lab/projects';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button, Button as UiButton } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { ProjectBalance } from '@/types/accounting';

type Props = {
  virtualLabId: string;
  onBack: () => void;
  shouldHaveBack?: boolean;
  shouldShowSwap?: boolean;
  swapClassname?: string;
  buttonClassname?: string;
};

export type ManageCreditsStepHandle = {
  swap: () => void;
  isPending: boolean;
};

type TransferDirection = 'vlab->proj' | 'proj->vlab';

async function transferCredits({
  virtualLabId,
  projectId,
  amount,
  direction,
}: {
  virtualLabId?: string;
  projectId?: string;
  amount?: number;
  direction: TransferDirection;
}) {
  if (!virtualLabId || !projectId) {
    throw new Error('Virtual lab ID and project ID are required');
  }
  if (!amount) {
    throw new Error('Amount is required');
  }

  if (direction === 'vlab->proj') {
    await assignProjectBudget({
      virtualLabId,
      projectId,
      amount,
    });
  } else if (direction === 'proj->vlab') {
    await reverseProjectBudget({
      virtualLabId,
      projectId,
      amount,
    });
  } else throw new Error('Transfer type not supported');
}

export function ManageCreditsStep({
  onBack,
  virtualLabId,
  shouldHaveBack = true,
  shouldShowSwap = true,
  swapClassname,
  buttonClassname,
  ref,
}: Props & {
  ref?: React.Ref<ManageCreditsStepHandle>;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string | undefined>(undefined);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [isLabToProject, setIsLabToProject] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const notify = useAppNotification();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const { projectId } = useWorkspace();

  const [labDetails, accountingRes, projectsRes] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.getOneLab({ virtualLabId }),
        queryFn: () => getVirtualLab(virtualLabId),
        enabled: Boolean(virtualLabId),
      },
      {
        queryKey: keyBuilder.accounting({ virtualLabId }),
        queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
        enabled: Boolean(virtualLabId),
      },
      {
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId }),
        queryFn: () => listProjects({ virtualLabId, page: 1, size: 40 }),
        enabled: Boolean(virtualLabId),
      },
    ],
  });

  const { mutateAsync: transferCreditsAsync, isPending } = useMutation({
    mutationKey: [
      {
        key: 'transfer-credits',
        virtualLabId,
        selectedProjectId,
        direction: isLabToProject ? 'vlab->proj' : 'proj->vlab',
      },
    ],
    retry: 1,
    mutationFn: () =>
      transferCredits({
        virtualLabId,
        projectId: selectedProjectId,
        amount: Number(amount),
        direction: isLabToProject ? 'vlab->proj' : 'proj->vlab',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keyBuilder.accounting({ virtualLabId }) });
      await queryClient.invalidateQueries({
        queryKey: keyBuilder.wallet({ virtualLabId, projectId: selectedProjectId! }),
      });
      notify.success({
        message: <span className="text-primary-9 text-lg font-bold">Credits transfer</span>,
        description: (
          <div className="flex items-center gap-2">
            {isLabToProject && (
              <span>
                You transferred <span className="text-primary-9 font-bold">{amount}</span> credits
                to{' '}
                <span className="text-primary-9 font-bold">
                  {projectsRes.data?.data?.results.find((p) => p.id === selectedProjectId)?.name}
                </span>
              </span>
            )}
            {!isLabToProject && (
              <span>
                You transferred <span className="text-primary-9 font-bold">{amount}</span> credits
                from{' '}
                <span className="text-primary-9 font-bold">
                  {projectsRes.data?.data?.results.find((p) => p.id === selectedProjectId)?.name}
                </span>{' '}
                to <span className="text-primary-9 font-bold">{virtualLabName}</span>
              </span>
            )}
          </div>
        ),
        placement: 'topRight',
        key: 'transfer-credits-success',
      });
      setAmount(undefined);
    },
    onError: (error) => {
      notify.error({
        message: <span className="text-primary-9 text-lg font-bold">Credits transfer</span>,
        description: (
          <div className="flex flex-col items-start gap-2">
            <span>There was an error transferring credits. Please try again.</span>
            {'message' in error && <small className="text-red-500">{error.message}</small>}
          </div>
        ),
        placement: 'topRight',
        key: 'transfer-credits-error',
      });
    },
  });

  const projects = useMemo(() => {
    const list = (projectsRes?.data?.data?.results ?? []).map((p) => ({
      value: String(p.id),
      label: String(p.name ?? ''),
    }));
    return list;
  }, [projectsRes]);

  const balanceMap: Map<string, number> = useMemo(() => {
    const map = new Map<string, number>();
    const balances = (accountingRes?.data?.data?.projects ?? []) as Array<ProjectBalance>;
    for (const item of balances) {
      const numericBalance = typeof item.balance === 'string' ? Number(item.balance) : item.balance;
      map.set(item.proj_id, Number.isFinite(numericBalance) ? numericBalance : 0);
    }
    return map;
  }, [accountingRes]);

  const virtualLabBalance: number = useMemo(() => {
    const bal = accountingRes?.data?.data?.balance ?? '0';
    const numeric = typeof bal === 'string' ? Number(bal) : bal;
    return Number.isFinite(numeric as number) ? (numeric as number) : 0;
  }, [accountingRes]);

  const selectedProjectBalance: number = useMemo(() => {
    return selectedProjectId ? (balanceMap.get(selectedProjectId) ?? 0) : 0;
  }, [balanceMap, selectedProjectId]);

  const virtualLabName = useMemo(() => {
    return labDetails?.data?.data?.virtual_lab?.name ?? 'Virtual Lab';
  }, [labDetails]);

  const onSwap = () => {
    if (isSwapping) return;
    setIsSwapping(true);
    setTimeout(() => setIsLabToProject((v) => !v), 250);
    setTimeout(() => setIsSwapping(false), 600);
  };

  useImperativeHandle(ref, () => ({
    swap: onSwap,
    isPending,
  }));

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(
        projects.find((p) => p.value === projectId)?.value ?? projects[0]?.value
      );
    }
  }, [projects, projectId, selectedProjectId]);

  useEffect(() => {
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-6">
      {(shouldHaveBack || shouldShowSwap) && (
        <div className="bg-primary-9 sticky top-0 z-10 flex shrink-0 items-center px-6 py-5">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-4">
              {shouldHaveBack && (
                <UiButton
                  rounded
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="hover:bg-neutral-2/20 h-auto px-4! py-2! text-white hover:text-white"
                >
                  <ArrowLeftOutlined className="text-lg" />
                  <span className="ml-4 text-lg font-bold text-white">Credits</span>
                </UiButton>
              )}
            </div>

            {shouldShowSwap && (
              <motion.button
                type="button"
                aria-label="Swap transfer direction"
                className={cn(
                  'bg-primary-8 hover:bg-primary-7 flex h-8 w-8 items-center justify-center rounded-md border border-white/20 text-white transition-all hover:scale-105 disabled:opacity-50',
                  swapClassname
                )}
                onClick={onSwap}
                disabled={isPending}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{ rotate: isSwapping ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <SwapOutlined className="text-sm" />
                </motion.div>
              </motion.button>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl items-stretch gap-4">
        <div className="bg-primary-8 flex w-[calc(50%-2.5rem)] flex-1 flex-col justify-between rounded-2xl border border-white/10 p-5 text-white shadow-2xl">
          <div className="flex w-full items-center gap-2">
            <span className="text-neutral-3">From</span>
            <Badge className="rounded-full border-white/10 bg-[#0e4a98] text-white/90">
              {isLabToProject ? 'Virtual Lab' : 'Project'}
            </Badge>
            <div className="ml-auto flex items-center gap-2 rounded-full bg-[#123e7d] px-3 py-1 text-sm">
              <CoinsIcon />
              <span className="font-bold">
                {isLabToProject ? (virtualLabBalance ?? 0) : selectedProjectBalance}
              </span>
            </div>
          </div>
          <div className="mt-auto">
            <AnimatePresence mode="wait">
              {isLabToProject ? (
                <div key="lab-name" className="truncate text-xl leading-10 font-semibold">
                  {virtualLabName}
                </div>
              ) : (
                <div key="project-select">
                  <Select
                    showSearch
                    loading={projectsRes.isLoading}
                    value={selectedProjectId}
                    onChange={(value: string) => setSelectedProjectId(value)}
                    size="large"
                    className={cn(
                      'w-full bg-transparent [&_.ant-select-arrow]:text-white! [&_.ant-select-selection-item]:text-xl!',
                      '[&_.ant-select-selection-item]:font-semibold! [&_.ant-select-selection-item]:text-white!',
                      '[&_.ant-select-selector]:border-0! [&_.ant-select-selector]:bg-transparent! [&_.ant-select-selector]:shadow-none!',
                      '[&_.ant-select-selection-search]:text-white'
                    )}
                    options={projects}
                    classNames={{
                      popup: {
                        root: cn(
                          '!bg-primary-8 !text-white',
                          '[&_.ant-select-item-option-content]:text-white!',
                          '[&_.ant-select-item-option-selected:not(.ant-select-item-option-disabled)]:bg-primary-7/50! [&_.ant-select-item-option-selected]:!text-white!',
                          '[&_.ant-empty-description]:text-white!'
                        ),
                      },
                    }}
                    optionFilterProp="label"
                    disabled={isPending}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex w-10 shrink-0 items-center">
          <div className="bg-primary-9 flex h-10 w-10 items-center justify-center rounded-lg text-white">
            <ArrowRightOutlined className="text-2xl" />
          </div>
        </div>

        <div className="bg-primary-8 flex h-full w-[calc(50%-2.5rem)] flex-1 flex-col justify-between rounded-2xl border border-white/10 p-5 text-white shadow-2xl">
          <div className="flex items-center gap-2">
            <span className="text-neutral-3">To</span>
            <Badge className="rounded-full border-white/10 bg-[#0e4a98] text-white/90">
              {isLabToProject ? 'Project' : 'Virtual Lab'}
            </Badge>
            <div className="ml-auto flex items-center gap-2 rounded-full bg-[#123e7d] px-3 py-1 text-sm">
              <CoinsIcon />
              <span className="font-bold">
                {isLabToProject ? selectedProjectBalance : (virtualLabBalance ?? 0)}
              </span>
            </div>
          </div>
          <div className="mt-auto">
            <AnimatePresence mode="wait">
              {isLabToProject ? (
                <div key="project-select-to">
                  <Select
                    showSearch
                    loading={projectsRes.isLoading}
                    value={selectedProjectId}
                    onChange={(value: string) => setSelectedProjectId(value)}
                    size="large"
                    className={cn(
                      'w-full bg-transparent [&_.ant-select-arrow]:text-white! [&_.ant-select-selection-item]:text-xl!',
                      '[&_.ant-select-selection-item]:font-semibold! [&_.ant-select-selection-item]:text-white!',
                      '[&_.ant-select-selector]:border-0! [&_.ant-select-selector]:bg-transparent! [&_.ant-select-selector]:shadow-none!',
                      '[&_.ant-select-selection-search]:text-white'
                    )}
                    options={projects}
                    classNames={{
                      popup: {
                        root: cn(
                          '!bg-primary-8 !text-white',
                          '[&_.ant-select-item-option-content]:text-white!',
                          '[&_.ant-select-item-option-selected:not(.ant-select-item-option-disabled)]:bg-primary-7/50! [&_.ant-select-item-option-selected]:!text-white!',
                          '[&_.ant-empty-description]:text-white!'
                        ),
                      },
                    }}
                    optionFilterProp="label"
                    disabled={isPending}
                  />
                </div>
              ) : (
                <div key="lab-name-to" className="truncate text-xl leading-10 font-semibold">
                  {virtualLabName}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-3">
        <div className="bg-primary-9 rounded-2xl border border-white/10 p-5 text-white">
          <div className="mb-3 text-lg font-semibold">Amount</div>
          <div className="relative w-full max-w-md">
            <Input
              id="amount"
              ref={amountInputRef}
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={cn(
                'text-primary-9 placeholder:text-neutral-3 h-16 rounded-xl border-white/20 bg-white pr-28 text-xl! font-bold',
                '[appearance:textfield] border px-4 py-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
              )}
              disabled={isPending}
            />
            <div className="text-primary-9 pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg">
              Credits
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn('mx-auto flex w-full max-w-3xl justify-end gap-4 self-end', buttonClassname)}
      >
        <Button
          rounded
          type="button"
          variant="ghost"
          size="lg"
          className="hover:border-primary-4! w-max border border-none text-white shadow-2xl hover:border"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button
          rounded
          type="button"
          variant="default"
          size="lg"
          className={cn(
            'border-primary-4! w-max border shadow-2xl',
            'hover:bg-primary-8/40',
            'hover:shadow-[1px_2px_4px_0px_#00000099]',
            'shadow-[8px_12px_24px_0px_#00000099]',
            'shadow-[-8px_-8px_42px_0px_#FFFFFF29]',
            'disabled:opacity-50'
          )}
          disabled={isPending || !amount}
          onClick={() => transferCreditsAsync()}
        >
          Transfer Credits
          {isPending && <LoadingOutlined spin className="ml-2 text-white" />}
        </Button>
      </div>
    </div>
  );
}
