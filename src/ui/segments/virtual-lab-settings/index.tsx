'use client';

import { CheckCircleOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import type { VirtualLab, VirtualLabListResponse } from '@/api/virtual-lab-svc/queries/types';
import { checkVirtualLabExists, updateVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { useTabs } from '@/components/detail-view-tabs';
import { useAppNotification } from '@/components/notification';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { useUserRole } from '@/hooks/use-user-role';
import { messages } from '@/i18n/en/virtual-lab';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { Credits } from '@/ui/segments/virtual-lab-settings/sections/credits';
import { TeamTable } from '@/ui/segments/virtual-lab-settings/sections/team';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

const baseNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a name for virtual lab')
  .max(60, 'The name must be less than 100 characters');

function buildAsyncNameSchema(currentName: string) {
  return baseNameSchema.superRefine(async (val: string, ctx: z.RefinementCtx) => {
    if (val === currentName.trim()) return;
    try {
      const exists = await checkVirtualLabExists({ name: val });
      if (exists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: messages.RenameVirtualLabNameAlreadyExists,
        });
      }
    } catch (_e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: messages.RenameVirtualLabNameValidationFailed,
      });
    }
  });
}

function EditableName({
  initialName,
  virtualLabId,
}: {
  initialName: string;
  virtualLabId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(initialName);
  const [currentName, setCurrentName] = useState(initialName);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    message: string | null;
    errors: Array<string>;
    checking: boolean;
  }>(() => ({ isValid: true, message: null, errors: [], checking: false }));
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { error: notifyError, success: notifySuccess } = useAppNotification();
  const queryClient = useQueryClient();
  const { isVirtualLabAdmin: isAdmin } = useUserRole({ virtualLabId });

  const updateMutation = useMutation({
    mutationFn: async (name: string) => {
      return updateVirtualLab({
        virtualLabId,
        updatePayload: { name },
      });
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({
        queryKey: keyBuilder.listAllLabs({
          includes: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS],
        }),
      });

      const previousData = queryClient.getQueryData(
        keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS] })
      ) as VirtualLabListResponse;
      queryClient.setQueryData(
        keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS] }),
        (old: VirtualLabListResponse) => {
          if (!old?.data) return old;
          const updatedVirtualLab = {
            ...old.data.virtual_lab,
            name,
          };

          const updatedMembershipLabs = {
            ...old.data.membership_labs,
            results:
              old.data.membership_labs?.results?.map((lab) =>
                lab.id === virtualLabId ? { ...lab, name } : lab
              ) || [],
          };

          return {
            ...old,
            data: {
              ...old.data,
              virtual_lab: updatedVirtualLab,
              membership_labs: updatedMembershipLabs,
            },
          };
        }
      );

      return { previousData };
    },
    onError: (__, _, context: { previousData?: VirtualLabListResponse } | undefined) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          keyBuilder.listAllLabs({ includes: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS] }),
          context.previousData
        );
        const prevData = context.previousData;
        if (prevData?.data) {
          const previousName =
            prevData.data.virtual_lab?.name ||
            prevData.data.membership_labs?.results?.find((lab: any) => lab.id === virtualLabId)
              ?.name;
          if (previousName) {
            setCurrentName(previousName);
          }
        }
      } else {
        setCurrentName(initialName);
      }
      notifyError({
        message: messages.RenameVirtualLabFailedTitle,
        description: messages.RenameVirtualLabFailedDescription,
        placement: 'topRight',
        key: 'virtual-lab-name-update-error',
      });
    },
    onSuccess: () => {
      notifySuccess({
        message: messages.RenameVirtualLabSucceedTitle,
        description: messages.RenameVirtualLabSucceedDescription,
        placement: 'topRight',
        key: 'virtual-lab-name-update-success',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: keyBuilder.listAllLabs({
          includes: [LabTypeEnum.MY_LAB, LabTypeEnum.MEMBERSHIP_LABS],
        }),
      });
    },
  });

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditingValue(currentName);
    setValidation({ isValid: true, message: null, errors: [], checking: false });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingValue(currentName);
    setValidation({ isValid: true, message: null, errors: [], checking: false });
  };

  const handleInputChange = (value: string) => setEditingValue(value);

  useEffect(() => {
    if (!isEditing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const value = editingValue;
    const run = async () => {
      const sync = baseNameSchema.safeParse(value);
      if (!sync.success) {
        setValidation({
          isValid: false,
          message: sync.error.issues[0]?.message || 'Invalid name',
          errors: sync.error.issues.map((i: z.ZodIssue) => i.message),
          checking: false,
        });
        return;
      }

      setValidation((prev) => ({ ...prev, checking: true }));
      const asyncSchema = buildAsyncNameSchema(currentName);
      const asyncRes = await asyncSchema.safeParseAsync(value);
      if (!asyncRes.success) {
        setValidation({
          isValid: false,
          message: asyncRes.error.issues[0]?.message || 'Invalid name',
          errors: asyncRes.error.issues.map((i: z.ZodIssue) => i.message),
          checking: false,
        });
        return;
      }
      setValidation({ isValid: true, message: null, errors: [], checking: false });
    };
    debounceRef.current = setTimeout(run, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [editingValue, isEditing, currentName]);

  const handleSaveEdit = async () => {
    const schema = buildAsyncNameSchema(currentName);
    const result = await schema.safeParseAsync(editingValue);
    if (!result.success) {
      setValidation({
        isValid: false,
        message: result.error.issues[0]?.message || 'Invalid name',
        errors: result.error.issues.map((i: z.ZodIssue) => i.message),
        checking: false,
      });
      return;
    }

    if (result.data === currentName.trim()) {
      setIsEditing(false);
      return;
    }

    const newName = result.data;
    setCurrentName(newName);
    setEditingValue(newName);
    setIsEditing(false);
    updateMutation.mutate(newName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="flex w-full items-start gap-2">
        <div className="flex w-full flex-col gap-1">
          <div className="relative">
            <input
              type="text"
              value={editingValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className={cn(
                'bg-transparent text-xl font-bold text-white placeholder:text-white/50',
                'w-full flex-1 border-b transition-all duration-200 ease-in-out outline-none',
                'rounded-t-sm py-0.5 pr-8 placeholder:text-sm placeholder:font-light',
                {
                  'border-primary-4 focus:border-white': validation.isValid,
                  'border-red-400 focus:border-red-400': !validation.isValid,
                }
              )}
              placeholder="Enter virtual lab name..."
              disabled={updateMutation.isPending}
            />
            <div className="absolute top-1/2 right-2 -translate-y-1/2">
              {editingValue.trim() && !validation.checking && (
                <div className="transition-all duration-200 ease-in-out">
                  {validation.isValid ? (
                    <CheckCircleOutlined className="animate-fade-in text-secondary-3 text-sm" />
                  ) : (
                    <CloseOutlined className="animate-fade-in text-destructive text-sm" />
                  )}
                </div>
              )}
            </div>
          </div>
          {!validation.checking && !validation.isValid && validation.errors.length > 0 && (
            <span className="animate-fade-in text-destructive max-w-56 text-xs">
              {validation.message}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            onClick={handleSaveEdit}
            disabled={updateMutation.isPending || !validation.isValid || validation.checking}
            className={cn(
              'h-8 w-8 rounded-full p-0 transition-all duration-200',
              'hover:text-secondary-3 bg-green-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <CheckOutlined className="text-sm" />
          </Button>
          <Button
            type="button"
            onClick={handleCancelEdit}
            disabled={updateMutation.isPending}
            className={cn(
              'h-8 w-8 rounded-full p-0 transition-all duration-200',
              'hover:text-destructive bg-red-500/20',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <CloseOutlined className="text-sm" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <ExpandableText
        id="project-description-text"
        text={currentName}
        collapsedLines={2}
        className="text-3xl font-bold break-words hyphens-auto transition-all duration-200 select-none group-hover:text-white/90"
      >
        {({ isExpanded, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-controls="virtual-lab-less-more"
            className={cn(
              'text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white',
              'text-sm'
            )}
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </ExpandableText>
      {isAdmin && (
        <Button
          type="button"
          onClick={handleStartEdit}
          className={cn(
            'h-8 w-8 rounded-full p-0 transition-all duration-200',
            'hover:text-primary-4 hover:bg-white/10'
          )}
        >
          <EditOutlined className="text-sm" />
        </Button>
      )}
    </div>
  );
}

function Header({
  onClose,
  virtualLab,
}: {
  onClose: () => void;
  virtualLab?: (VirtualLab & { isMine: boolean }) | null;
}) {
  const name = virtualLab?.name || '';
  const numberOfProjects = virtualLab?.projects_count ?? 0;
  const virtualLabId = virtualLab?.id || '';

  return (
    <div className="flex items-start justify-between gap-4 py-4 text-white">
      <div className="flex w-2/3 flex-col gap-0.5">
        {virtualLabId && <EditableName initialName={name} virtualLabId={virtualLabId} />}
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {!!numberOfProjects && (
          <p className="text-primary-3 w-max">
            {numberOfProjects} {numberOfProjects > 1 ? 'projects' : 'project'}
          </p>
        )}
        <Button type="button" onClick={onClose} className="h-10 w-10 hover:bg-white/10">
          <CloseOutlined />
        </Button>
      </div>
    </div>
  );
}

const tabsConfigItems: Array<{
  key: 'team' | 'credits';
  title: string;
}> = [
  {
    key: 'team',
    title: 'Members',
  },
  {
    key: 'credits',
    title: 'Credits',
  },
];

type TabKeys = (typeof tabsConfigItems)[number]['key'];

function Tabs({ id }: { id?: string | null }) {
  const breakpoint = useDefaultBreakpoint();
  const { activeTab, onChangeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });
  const { isVirtualLabAdmin: isAdmin } = useUserRole({ virtualLabId: id! });
  const [popoverOpen, setIsPopoverOpen] = useState(false);

  const onOpenChange = (visible: boolean) => {
    if (!isAdmin || !visible) setIsPopoverOpen(true);
    else setIsPopoverOpen(false);
  };

  return (
    <PillTabs
      value={activeTab ?? 'team'}
      defaultValue={activeTab ?? 'team'}
      className="border-primary-8/40 w-full rounded-l-full rounded-r-full border shadow-lg"
      activationMode="manual"
      onValueChange={(value) => {
        if (value === 'credits' && !isAdmin) return;
        onChangeTab(value as TabKeys)();
      }}
    >
      <PillTabsList
        className={cn('bg-primary-9 grid h-10 w-full grid-cols-2 p-0', {
          'h-12': breakpoint === 'xl',
        })}
      >
        <PillTabsTrigger
          key="team"
          value="team"
          className={cn(
            'hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-10 px-14! py-3 text-base text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold',
            { 'h-12': breakpoint === 'xl' }
          )}
        >
          Administrators
        </PillTabsTrigger>
        <CustomPopover
          when={['hover']}
          message="Only Administrator can explore virtual lab credits."
          placement="bottom"
          visible={popoverOpen}
          onOpenChange={onOpenChange}
        >
          <PillTabsTrigger
            key="credits"
            value="credits"
            className={cn(
              'hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-10 px-14! py-3 text-base text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold',
              { 'h-12': breakpoint === 'xl', 'cursor-not-allowed opacity-50': !isAdmin }
            )}
            onMouseLeave={() => setIsPopoverOpen(false)}
          >
            Credits
          </PillTabsTrigger>
        </CustomPopover>
      </PillTabsList>
    </PillTabs>
  );
}

function Content({ id }: { id?: string | null }) {
  const { activeTab } = useTabs<TabKeys>({
    tabsConfig: tabsConfigItems,
    tabKey: 'section',
    shallow: true,
    clearOnDefault: true,
  });

  if (!id) return null;

  return match({ activeTab })
    .with({ activeTab: P.nullish }, () => <TeamTable virtualLabId={id} />)
    .with({ activeTab: 'team' }, () => <TeamTable virtualLabId={id} />)
    .with({ activeTab: 'credits' }, () => <Credits virtualLabId={id} />)
    .otherwise(() => <TeamTable virtualLabId={id} />);
}

type Props = {
  onClose: () => void;
  payload: {
    virtualLabId: string | null;
    data: (VirtualLab & { isMine: boolean }) | null;
  } | null;
};

export function VirtualLabConfiguration({ onClose, payload }: Props) {
  return (
    <div
      id="virtual-lab-settings-container"
      className="flex h-full max-h-[calc(100vh-1.5rem)] min-h-0 flex-col overflow-hidden"
    >
      <div
        id="virtual-lab-settings-header"
        className="bg-primary-9 sticky top-0 left-0 z-[1002] px-6 pt-2"
      >
        <Header onClose={onClose} virtualLab={payload?.data} key={payload?.data?.id} />
        <Tabs id={payload?.virtualLabId} />
      </div>
      <div
        id="virtual-lab-settings-content"
        className="primary-scrollbar h-full min-h-0 flex-1 overflow-y-auto transition-opacity duration-200 ease-in-out"
      >
        <Content id={payload?.virtualLabId} />
      </div>
    </div>
  );
}
