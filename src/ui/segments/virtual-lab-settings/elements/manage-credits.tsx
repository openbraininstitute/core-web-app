'use client';

import { ArrowLeftOutlined, LoadingOutlined, SwapOutlined } from '@ant-design/icons';
import { RiArrowRightSLine } from '@remixicon/react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Select } from 'antd';
import { get } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { listProjects } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { CoinsIcon } from '@/components/icons/buttons';
import { notify } from '@/components/notification';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { assignProjectBudget, reverseProjectBudget } from '@/services/virtual-lab/projects';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Input } from '@/ui/molecules/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { GhostRoundedIconButton } from '@/ui/segments/workspaces/space-manager/sections/elements';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { ProjectBalance } from '@/types/accounting';

const PROJECT_SELECT_TRIGGER_CLASSNAME = cn(
  'w-full h-10! min-h-10! bg-transparent',
  '[&_.ant-select-arrow]:text-primary-9! [&_.ant-select-selection-item]:text-base! [&_.ant-select-selection-item]:leading-10!',
  '[&_.ant-select-selection-item]:font-semibold! [&_.ant-select-selection-item]:text-primary-9!',
  '[&_.ant-select-selector]:border-gray-200! [&_.ant-select-selector]:bg-transparent! [&_.ant-select-selector]:shadow-none!',
  '[&_.ant-select-selection-search]:text-primary-9'
);

const PROJECT_SELECT_POPUP_CLASSNAMES = {
  popup: {
    root: cn(
      '!bg-white !text-primary-9',
      '[&_.ant-select-item-option-content]:text-primary-9!',
      '[&_.ant-select-item-option-selected:not(.ant-select-item-option-disabled)]:bg-primary-7/50! [&_.ant-select-item-option-selected]:!text-primary-9!',
      '[&_.ant-empty-description]:text-primary-9!'
    ),
  },
} as const;

/** Ease-out curve (approx. quint); motion skill: decelerate into rest, no bounce */
const SWAP_EASE = [0.22, 1, 0.36, 1] as const;
/** One outward swipe; direction flips at end, then transform snaps back (no second glide). */
const SWAP_OUT_MS = 300;

type SwapCardPhase = 'idle' | 'cross';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function VirtualLabNameCell({ name }: { name: string }) {
  return (
    <div
      title={name}
      className={cn(
        'flex h-10! min-h-10! items-center justify-center truncate rounded-lg',
        'border border-gray-200 px-3 text-base leading-10 font-semibold line-clamp-2 text-primary-9'
      )}
    >
      {name}
    </div>
  );
}

type ProjectOption = { value: string; label: string };

function ProjectCreditSelect({
  options,
  loading,
  value,
  onChange,
  disabled,
}: {
  options: ProjectOption[];
  loading: boolean;
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      showSearch
      loading={loading}
      value={value}
      onChange={onChange}
      size="middle"
      className={PROJECT_SELECT_TRIGGER_CLASSNAME}
      options={options}
      classNames={PROJECT_SELECT_POPUP_CLASSNAMES}
      optionFilterProp="label"
      disabled={disabled}
    />
  );
}

function TransferEndpointCard({
  balance,
  heading,
  entityLabel,
  coinsIconClassName,
  footer,
  className,
}: {
  balance: number;
  heading: string;
  entityLabel: string;
  coinsIconClassName?: string;
  footer: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-full w-full min-w-0 flex-1 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 text-primary-9 shadow-bnb hover:bg-gray-50',
        className
      )}
    >
      <div className="mb-5 ml-auto flex items-center gap-2 rounded-full border border-gray-100 bg-gray-100 px-3 py-1 text-sm text-primary-9">
        <CoinsIcon className={coinsIconClassName} />
        <span className="font-bold">{balance}</span>
      </div>
      <div className="mb-3 flex w-full items-center gap-2">
        <span className="text-gray-500">{heading}</span>
        <Badge className="rounded-full border-gray-100 bg-gray-100 text-primary-9">
          {entityLabel}
        </Badge>
      </div>
      <div className="mt-auto">{footer}</div>
    </div>
  );
}

function SwapDirectionTooltip({
  onSwap,
  disabled,
  swapSpinTurns,
  reduceMotion,
}: {
  onSwap: () => void;
  disabled: boolean;
  /** Full 180° turns; each swap increments for a continuous spin read */
  swapSpinTurns: number;
  reduceMotion: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            rounded
            type="button"
            variant="icon"
            size="md"
            aria-label="Swap transfer direction"
            className={cn(
              'flex items-center justify-center rounded-full border border-gray-100 bg-white',
              'text-primary-9 shadow-bnb hover:border-gray-200 hover:shadow-bnb'
            )}
            onClick={onSwap}
            disabled={disabled}
          >
            <motion.span
              className="inline-flex will-change-transform"
              animate={
                reduceMotion ? { rotate: 0, scale: 1 } : { rotate: swapSpinTurns * 180, scale: 1 }
              }
              transition={{
                rotate: {
                  duration: SWAP_OUT_MS / 1000,
                  ease: SWAP_EASE,
                },
                scale: { duration: 0.2, ease: SWAP_EASE },
              }}
            >
              <SwapOutlined className="text-sm" />
            </motion.span>
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        align="center"
        sideOffset={4}
        className="z-2000 border border-gray-100 bg-white text-primary-9 shadow-bnb"
        arrowClassName="bg-white"
        showArrow
      >
        Swap transfer direction
      </TooltipContent>
    </Tooltip>
  );
}

type Props = {
  virtualLabId: string;
  onBack: () => void;
  shouldHaveBack?: boolean;
  shouldShowSwap?: boolean;
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

export function TransferCredits({
  onBack,
  virtualLabId,
  shouldHaveBack = true,
  shouldShowSwap = true,
  classnames,
  ref,
}: Props & {
  ref?: React.Ref<ManageCreditsStepHandle>;
  classnames?: {
    root?: string;
    content?: string;
    body?: string;
    footer?: string;
  };
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState<string>('');
  const [swapPhase, setSwapPhase] = useState<SwapCardPhase>('idle');
  const [swapSpinTurns, setSwapSpinTurns] = useState(0);
  const [isLabToProject, setIsLabToProject] = useState<boolean>(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const swapTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const { projectId } = useWorkspace();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [labDetails, accountingRes, projectsRes] = useQueries({
    queries: [
      {
        queryKey: keyBuilder.getOneLab({ virtualLabId }),
        queryFn: () => getVirtualLab({ id: virtualLabId }),
        enabled: Boolean(virtualLabId),
      },
      {
        queryKey: keyBuilder.accounting({ virtualLabId }),
        queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
        enabled: Boolean(virtualLabId),
      },
      {
        queryKey: keyBuilder.listWorkspaceProjects({ virtualLabId }),
        // TODO: do not fetch by fixed page_size
        // make it loop through pages until it gets all projects
        queryFn: () => listProjects({ virtualLabId, pagination: { page: 1, page_size: 40 } }),
        enabled: Boolean(virtualLabId),
      },
    ],
  });

  const projects = useMemo(() => {
    const list = (projectsRes?.data?.data ?? []).map((p) => ({
      value: String(p.id),
      label: String(p.name ?? ''),
    }));
    return list;
  }, [projectsRes]);

  const selectedProjectName = useMemo(
    () => projects.find((p) => p.value === selectedProjectId)?.label ?? '',
    [projects, selectedProjectId]
  );

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
      if (selectedProjectId) {
        await queryClient.invalidateQueries({
          queryKey: keyBuilder.wallet({ virtualLabId, projectId: selectedProjectId }),
        });
      }
      notify.success({
        title: 'Credits transfer',
        description: (
          <div className="flex items-center gap-2">
            {isLabToProject && (
              <span>
                You transferred <span className="text-primary-9 font-bold">{amount}</span> credits
                to <span className="text-primary-9 font-bold">{selectedProjectName}</span>
              </span>
            )}
            {!isLabToProject && (
              <span>
                You transferred <span className="text-primary-9 font-bold">{amount}</span> credits
                from <span className="text-primary-9 font-bold">{selectedProjectName}</span> to{' '}
                <span className="text-primary-9 font-bold">{virtualLabName}</span>
              </span>
            )}
          </div>
        ),
        key: 'transfer-credits-success',
      });
      setAmount('');
    },
    onError: (error) => {
      const codeError = get(error, 'cause.error_code', 'DEFAULT');
      const description = {
        EXTERNAL_SERVICE_ERROR: get(
          error,
          'cause.message',
          'An external service error occurred. Please try again.'
        ),
        DEFAULT: 'There was an error transferring credits. Please try again.',
      };
      notify.error({
        title: 'Credits transfer failed',
        description: (
          <div className="flex flex-col items-start gap-2">
            <span>{description[codeError]}</span>
          </div>
        ),
        key: 'transfer-credits-error',
      });
    },
  });

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
    return labDetails?.data?.name ?? 'Virtual Lab';
  }, [labDetails]);

  useEffect(() => {
    return () => {
      for (const id of swapTimersRef.current) {
        clearTimeout(id);
      }
      swapTimersRef.current = [];
    };
  }, []);

  const onSwap = () => {
    if (isPending || swapPhase !== 'idle') return;
    if (prefersReducedMotion) {
      setIsLabToProject((v) => !v);
      return;
    }
    for (const id of swapTimersRef.current) {
      clearTimeout(id);
    }
    swapTimersRef.current = [];
    setSwapSpinTurns((t) => t + 1);
    setSwapPhase('cross');
    swapTimersRef.current.push(
      setTimeout(() => {
        setIsLabToProject((v) => !v);
        setSwapPhase('idle');
        swapTimersRef.current = [];
      }, SWAP_OUT_MS)
    );
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

  const selectLoading = projectsRes.isLoading;
  const selectDisabled = isPending;
  const handleProjectChange = (value: string) => setSelectedProjectId(value);

  const fromFooter = (
    <AnimatePresence mode="wait">
      {isLabToProject ? (
        <div key="from-lab">
          <VirtualLabNameCell name={virtualLabName} />
        </div>
      ) : (
        <div key="from-project">
          <ProjectCreditSelect
            options={projects}
            loading={selectLoading}
            value={selectedProjectId}
            onChange={handleProjectChange}
            disabled={selectDisabled}
          />
        </div>
      )}
    </AnimatePresence>
  );

  const toFooter = (
    <AnimatePresence mode="wait">
      {isLabToProject ? (
        <div key="to-project">
          <ProjectCreditSelect
            options={projects}
            loading={selectLoading}
            value={selectedProjectId}
            onChange={handleProjectChange}
            disabled={selectDisabled}
          />
        </div>
      ) : (
        <div key="to-lab">
          <VirtualLabNameCell name={virtualLabName} />
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      id="transfer-credits__root"
      data-testid="transfer-credits__root"
      className={cn(
        'flex h-full min-h-0 w-full flex-1 flex-col gap-3.5 rounded-2xl bg-white px-4 pt-0',
        classnames?.root
      )}
    >
      <div
        id="transfer-credits__content"
        className={cn(
          'mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3.5',
          classnames?.content
        )}
      >
        {(shouldHaveBack || shouldShowSwap) && (
          <div className="flex w-full shrink-0 items-center justify-between pt-5">
            <div className="flex items-center gap-4">
              {shouldHaveBack && (
                <GhostRoundedIconButton
                  icon={<ArrowLeftOutlined />}
                  label="Credits"
                  classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
                  onClick={onBack}
                  iconPosition="start"
                />
              )}
            </div>
          </div>
        )}

        <div
          id="transfer-credits__body"
          data-testid="transfer-credits__body"
          className={cn(
            'mr-1 flex flex-col gap-8 rounded-2xl border border-gray-100 p-4',
            classnames?.body
          )}
        >
          <div className="mx-auto flex w-full max-w-3xl items-stretch gap-4 overflow-visible">
            <motion.div
              className={cn(
                'flex w-[calc(50%-2.5rem)] min-w-0 flex-1 shrink-0 will-change-transform',
                swapPhase !== 'idle' && 'relative z-10'
              )}
              animate={
                swapPhase === 'cross'
                  ? { x: '18vw', opacity: 0.9, scale: 0.985 }
                  : { x: 0, opacity: 1, scale: 1 }
              }
              transition={{
                duration: swapPhase === 'cross' ? SWAP_OUT_MS / 1000 : 0,
                ease: SWAP_EASE,
              }}
            >
              <TransferEndpointCard
                heading="From"
                entityLabel={isLabToProject ? 'Virtual Lab' : 'Project'}
                balance={isLabToProject ? (virtualLabBalance ?? 0) : selectedProjectBalance}
                coinsIconClassName="text-primary-9"
                footer={fromFooter}
              />
            </motion.div>

            <div className="flex w-10 shrink-0 items-center">
              <SwapDirectionTooltip
                onSwap={onSwap}
                disabled={isPending || swapPhase !== 'idle'}
                swapSpinTurns={swapSpinTurns}
                reduceMotion={prefersReducedMotion}
              />
            </div>

            <motion.div
              className={cn(
                'flex w-[calc(50%-2.5rem)] min-w-0 flex-1 shrink-0 will-change-transform',
                swapPhase !== 'idle' && 'relative z-10'
              )}
              animate={
                swapPhase === 'cross'
                  ? { x: '-18vw', opacity: 0.9, scale: 0.985 }
                  : { x: 0, opacity: 1, scale: 1 }
              }
              transition={{
                duration: swapPhase === 'cross' ? SWAP_OUT_MS / 1000 : 0,
                ease: SWAP_EASE,
              }}
            >
              <TransferEndpointCard
                heading="To"
                entityLabel={isLabToProject ? 'Project' : 'Virtual Lab'}
                balance={isLabToProject ? selectedProjectBalance : (virtualLabBalance ?? 0)}
                footer={toFooter}
              />
            </motion.div>
          </div>

          <div
            className="mx-auto max-w-3xl px-3"
            id="transfer-credits__amount"
            data-testid="transfer-credits__amount"
          >
            <div className="rounded-2xl border border-gray-100 bg-white p-5 text-primary-9 shadow-bnb">
              <div className="mb-0.5 ml-1 text-base font-light text-gray-500">Amount</div>
              <div className="relative w-full max-w-md">
                <Input
                  id="amount"
                  ref={amountInputRef}
                  autoComplete="off"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  min={0}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0"
                  className={cn(
                    'min-h-14 rounded-2xl border-2 border-gray-100! bg-transparent! px-3 py-2 text-xl! font-bold tracking-wide text-primary-9! focus:ring-0',
                    'transition-[border-color,box-shadow] duration-200 ease-in-out',
                    'hover:bg-transparent! hover:text-primary-9! focus:bg-transparent! focus:text-primary-9! [&_.ant-input-outlined]:bg-transparent!',
                    'focus:border-pr placeholder:text-primary-9! hover:border-gray-200!',
                    ' focus-within:border-gray-300! focus-visible:ring-0',
                    '[&.ant-input-status-error]:border-1.5! [&.ant-XInput-status-error]:border-destructive!',
                    '[&.ant-input-status-error]:border-1.5! [&.ant-input-status-error]:border-destructive!'
                  )}
                  disabled={isPending}
                />
                <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-base text-gray-500">
                  Credits
                </div>
              </div>
            </div>
          </div>

          <div className={cn('mt-5 flex items-center justify-end gap-3', classnames?.footer)}>
            <GhostRoundedIconButton
              label="Cancel"
              classNames={{ label: 'font-semibold', root: 'hover:bg-gray-100' }}
              onClick={onBack}
              iconPosition="start"
            />

            <GhostRoundedIconButton
              label="Transfer credits"
              icon={isPending ? <LoadingOutlined spin /> : <RiArrowRightSLine />}
              classNames={{
                root: 'bg-primary-9 text-white hover:bg-primary-8 group disabled:bg-neutral-2! disabled:text-neutral-4! disabled:opacity-100!',
                label: 'text-white pr-3 group-disabled:text-neutral-4!',
                iconWrapper:
                  'bg-primary-9 text-white group-hover:bg-primary-8 group-disabled:bg-neutral-2! group-disabled:text-neutral-4! [&_svg]:size-5!',
              }}
              disabled={isPending || !Number(amount)}
              onClick={() => transferCreditsAsync()}
              iconPosition="end"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
