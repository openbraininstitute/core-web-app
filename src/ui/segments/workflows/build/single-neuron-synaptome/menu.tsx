'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleFilled,
  LoadingOutlined,
  RightOutlined,
  SettingFilled,
  WarningFilled,
} from '@ant-design/icons';
import { z } from 'zod';

import kebabCase from 'lodash/kebabCase';
import isNil from 'lodash/isNil';
import Link from 'next/link';

import { SynapseSetMenuItems } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-set-menu-item';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { createSingleNeuronSynaptome } from '@/api/small-scale-simulator';
import { ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import {
  BuildStep,
  BuildStepKeys,
  DefaultSynapseValue,
  useBuildSingleNeuronSynaptomeSessionState,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  SingleNeuronSynaptomeBaseSchema,
  SingleNeuronSynaptomeConfigurationSchema,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { useAppNotification } from '@/components/notification';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { browserHistoryReplace } from '@/utils/browser';
import { messages } from '@/i18n/en/synaptome';
import { Button } from '@/ui/molecules/button';
import { tryCatch } from '@/api/utils';
import { cn } from '@/utils/css-class';
import { ROOT_ROUTE } from '@/config';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';

type Props = { sessionId: string };

const mainFormSchema = z.object({
  name: z.string().nonempty().min(1),
  description: z.string().optional(),
  me_model_id: z.string().uuid(),
  seed: z.number().nonnegative(),
});

export function Menu({ sessionId }: Props) {
  const notification = useAppNotification();
  const breakpoint = useDefaultBreakpoint();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { virtualLabId, projectId } = useWorkspace();
  const step = searchParams.get('step');

  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  const onStepChange = (s: BuildStepKeys) => {
    const query = new URLSearchParams(searchParams);
    query.set('step', s);

    browserHistoryReplace(null, `${pathname}?${query.toString()}`);
  };

  const onAdd = () => {
    const queryParams = new URLSearchParams(searchParams);
    queryParams.set('step', BuildStep.SynapseSet);

    if ((sessionValue?.synapseSets?.size ?? 0) <= 0) {
      const id = crypto.randomUUID();
      queryParams.set('set', id);
      const synapseSetsMap = new Map<string, TSingleNeuronSynaptomeConfiguration>([]);
      synapseSetsMap.set(id, {
        ...DefaultSynapseValue,
        id,
        seed: 100,
      });

      setSessionValue({
        ...sessionValue,
        seed: sessionValue?.seed ?? 100,
        synapseSets: synapseSetsMap,
      });
    }

    browserHistoryReplace(null, `${pathname}?${queryParams.toString()}`);
  };

  const validSetsCount = Array.from(sessionValue?.synapseSets?.values() ?? [])?.filter(
    (o) => SingleNeuronSynaptomeBaseSchema.safeParse(o).success
  ).length;

  const validateMainForm = mainFormSchema.safeParse({
    name: sessionValue?.name,
    description: sessionValue?.description,
    me_model_id: sessionValue?.memodel?.id,
    seed: sessionValue?.seed,
  }).success;

  const buildSynaptome = async () => {
    const validateMainFormData = mainFormSchema.safeParse({
      name: sessionValue?.name,
      description: sessionValue?.description,
      me_model_id: sessionValue?.memodel?.id,
      seed: sessionValue?.seed,
    }).data;

    const validationPromises = Array.from(sessionValue?.synapseSets?.entries() ?? []).map(
      ([, value]) => SingleNeuronSynaptomeConfigurationSchema.safeParseAsync(value)
    );
    const sets = (await Promise.all(validationPromises)).filter((o) => o.success);

    if (validateMainForm) {
      const { data, error } = await tryCatch(
        createSingleNeuronSynaptome({
          ctx: { virtualLabId, projectId },
          modelInfo: {
            name: validateMainFormData?.name!,
            description: validateMainFormData?.description || '',
            seed: validateMainFormData?.seed!,
            memodel_id: validateMainFormData?.me_model_id!,
            brain_region_id: sessionValue?.memodel?.brain_region?.id!,
            config: {
              synapses: sets.map((o) => o.data),
            },
          },
        })
      );
      if (error) throw new Error(messages.CreateSynaptomeEntityFailed);

      return {
        entity: data.data,
      };
    }
  };

  const mutate = useMutation({
    mutationFn: buildSynaptome,
    onSuccess: (data) => {
      notification.success({
        message: messages.CreationModelSucceed,
        description: (
          <div>
            <Link
              onClick={() => {
                notification.destroy('model-saved');
              }}
              href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(ExtendedEntitiesTypeDict.SingleNeuronSynaptome)}/${data?.entity.id}`}
              className="text-primary-6 hover:underline"
            >
              Go to model details
            </Link>
          </div>
        ),
        onClick: () => {
          notification.destroy('model-saved');
        },
        placement: 'topRight',
        key: 'model-saved',
        duration: 10,
      });
    },
    onError: (error) => {
      const errorMessage =
        (error as any)?.cause?.error_code === 'INSUFFICIENT_FUNDS'
          ? messages.LowFundsError
          : messages.CreationModelFailed;
      notification.error({
        message: errorMessage,
        duration: 7,
        placement: 'topRight',
        key: 'synaptome-config',
      });
    },
    async onSettled() {
      await queryClient.invalidateQueries({
        queryKey: [
          {
            context: {
              key: `${virtualLabId}/${projectId}/data/${kebabCase(ExtendedEntitiesTypeDict.SingleNeuronSynaptome)}/project`,
            },
          },
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          keyBuilder.activities({
            virtualLabId,
            projectId,
            activity: ActivityValues.Build,
            entityType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
          }),
        ],
      });
    },
  });

  const disabled = !validSetsCount || !validateMainForm || mutate.isPending;
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="text-neutral-3 ml-4 font-light uppercase">Setup</div>
      <Button
        rounded
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        className={cn('group w-full justify-start pr-2! font-bold shadow-md')}
        active={step === BuildStep.Info}
        onClick={() => onStepChange(BuildStep.Info)}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            <SettingFilled
              className={cn('text-neutral-3 mr-2 group-hover:text-white', {
                'text-primary-4!': step === BuildStep.Info,
              })}
            />
            Info
          </div>
          <div className="flex items-center justify-center gap-3">
            {!sessionValue?.name && (
              <Tooltip>
                <TooltipTrigger>
                  <WarningFilled className="text-sm text-yellow-300" />
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  side="bottom"
                  sideOffset={10}
                  collisionPadding={{ left: 25 }}
                  className="text-destructive shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100 px-4 py-5 text-wrap"
                  arrowClassName="bg-amber-100"
                >
                  <p className="w-full pb-0.5 break-words hyphens-auto">
                    • The model name cannot be empty.
                  </p>
                  <p className="w-full pb-0.5 break-words hyphens-auto">
                    • Please enter a model name (minimum 1 character).
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            <RightOutlined
              className={cn('text-neutral-4 mr-2 transition-all group-hover:text-white', {
                '-rotate-180 text-white!': step === BuildStep.Info,
              })}
            />
          </div>
        </div>
      </Button>
      <div className="text-neutral-3 ml-4 font-light uppercase">Modeling</div>
      <Button
        rounded
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        className={cn('group w-full justify-start pr-2 shadow-md')}
        active={step === BuildStep.MEModel}
        onClick={() => onStepChange(BuildStep.MEModel)}
      >
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="flex-shrink-0 font-bold">ME-model</div>
          {sessionValue?.memodel ? (
            <Tooltip>
              <TooltipTrigger>
                <div className="text-accent-light flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  <CheckCircleFilled className="flex-shrink-0 text-base" />
                  <div
                    title={sessionValue.memodel.name}
                    aria-label={sessionValue.memodel.name}
                    className="line-clamp-1 min-w-0 flex-1 truncate text-left"
                  >
                    {sessionValue?.memodel.name}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={4} avoidCollisions arrowClassName="bg-primary-9">
                <p className={cn('text-justify text-base')}>{sessionValue?.memodel.name}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="text-neutral-4 group-hover:text-label flex-1 self-end text-right text-sm leading-7 transition-all">
              Select ME-model
            </div>
          )}
          <RightOutlined
            className={cn('text-neutral-4 group-hover:text-label mr-2 transition-all', {
              '-rotate-180 text-white! group-hover:text-white': step === BuildStep.MEModel,
            })}
          />
        </div>
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex w-full flex-col">
            <Button
              rounded
              variant="outline"
              size={breakpoint === 'l' ? 'md' : 'lg'}
              className={cn('disabled:bg-neutral-1/40 w-full justify-start pr-2 shadow-md')}
              active={step === BuildStep.SynapseSet}
              onClick={onAdd}
              disabled={isNil(sessionValue?.memodel)}
            >
              <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
                <div className="flex-shrink-0 font-bold">Synapse sets</div>
                <div className="ml-auto flex items-center justify-center gap-2">
                  {!!validSetsCount && (
                    <div>
                      {validSetsCount > 1 ? `${validSetsCount} sets` : `${validSetsCount} set`}
                    </div>
                  )}
                  <RightOutlined
                    className={cn('text-neutral-4 mr-2 transition-all', {
                      '-rotate-180 text-white! group-hover:text-white':
                        step === BuildStep.SynapseSet,
                    })}
                  />
                </div>
              </div>
            </Button>
          </div>
        </TooltipTrigger>
        {isNil(sessionValue?.memodel) && (
          <TooltipContent sideOffset={0} side="bottom" arrowClassName="bg-primary-9">
            <p className={cn('text-justify text-base')}>Please select me model first</p>
          </TooltipContent>
        )}
      </Tooltip>
      {!isNil(sessionValue?.memodel) && (
        <div className="px-4 pt-3">
          <SynapseSetMenuItems sessionId={sessionId} />
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-auto w-full">
            <Button
              rounded
              variant="success"
              size={breakpoint === 'l' ? 'md' : 'lg'}
              className={cn(
                'disabled:bg-neutral-2/40 disabled:text-label! w-full justify-center px-10 font-medium!'
              )}
              onClick={() => mutate.mutateAsync()}
              disabled={disabled}
            >
              <div className="flex-shrink-0 font-bold">Build synaptome</div>
              {mutate.isPending && <LoadingOutlined className="ml-2 text-white" />}
            </Button>
          </div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent
            sideOffset={4}
            avoidCollisions
            collisionPadding={{ left: 25 }}
            arrowClassName="bg-primary-9"
          >
            <p className={cn('text-justify text-base')}>
              Please fill all the required information <br /> along with selecting me-model and
              configuring synapses
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}
