'use client';

import {
  CheckCircleFilled,
  LoadingOutlined,
  RightOutlined,
  SettingFilled,
  WarningFilled,
} from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import get from 'lodash/get';
import kebabCase from 'lodash/kebabCase';
import omit from 'lodash/omit';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { createModel } from '@/api/small-scale-simulator/single-neuron/single-neuron';
import { CreateSingleNeuronSchema } from '@/api/small-scale-simulator/types';
import { useAppNotification } from '@/components/notification';
import { ROOT_ROUTE } from '@/config';
import { LOW_FUNDS_ERROR_CODE, messages } from '@/i18n/en/me-model';
import { WorkspaceContextSchema } from '@/types/common';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import {
  BuildStep,
  BuildStepKeys,
  useBuildMeModelSessionState,
} from '@/ui/segments/workflows/build/memodel/helpers';
import { ActivityValues } from '@/ui/segments/workflows/elements/helpers';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

const CreateSingleNeuronContextSchema = CreateSingleNeuronSchema.merge(WorkspaceContextSchema);
type TCreateSingleNeuronContext = z.infer<typeof CreateSingleNeuronContextSchema>;

export function Menu({ sessionId }: { sessionId: string }) {
  const breakpoint = useDefaultBreakpoint();
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { replace } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const step = searchParams.get('step');

  const { sessionValue } = useBuildMeModelSessionState({
    sessionId,
    virtualLabId,
    projectId,
  });

  const onStepChange = (s: BuildStepKeys) => {
    const query = new URLSearchParams(searchParams);
    query.set('step', s);

    replace(
      `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/memodel?${query.toString()}`
    );
  };

  const payload: Partial<TCreateSingleNeuronContext> = {
    virtualLabId,
    projectId,
    name: sessionValue.name,
    description: sessionValue.description ?? '',
    emodel_id: sessionValue.emodel?.id,
    morphology_id: sessionValue.mmodel?.id,
    species_id: sessionValue.mmodel?.subject.species?.id,
    brain_region_id: sessionValue.mmodel?.brain_region.id ?? sessionValue.brainRegion?.id,
    strain_id: sessionValue.mmodel?.subject.strain?.id ?? null,
  };

  const buildMeModel = async () => {
    const validatedPayload = await CreateSingleNeuronContextSchema.parseAsync(payload);

    return await createModel({
      modelInfo: omit(validatedPayload, ['virtualLabId', 'projectId']),
      ctx: { virtualLabId, projectId },
    });
  };

  const mutate = useMutation({
    mutationFn: buildMeModel,
    onSuccess: (data) => {
      notification.success({
        message: messages.CreationModelSucceed,
        description: (
          <div>
            <Link
              onClick={() => {
                notification.destroy('model-saved');
              }}
              href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(ExtendedEntitiesTypeDict.Memodel)}/${data.data.id}`}
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
    onError(err) {
      log('error', 'Build me-model failed:', err);
      const message =
        get(err, 'cause.error_code') === LOW_FUNDS_ERROR_CODE
          ? messages.LowFundsError
          : messages.DefaultErrorMsg;

      notification.error({
        message: 'ME-model creation failed',
        description: message,
        placement: 'topRight',
        duration: 10,
      });
    },
    async onSettled() {
      await queryClient.invalidateQueries({
        queryKey: [{ context: { key: `${virtualLabId}/${projectId}/data/memodel/project` } }],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          'workspace/activities',
          {
            virtualLabId,
            projectId,
            activity: ActivityValues.Build,
            entityType: ExtendedEntitiesTypeDict.Memodel,
          },
        ],
      });
    },
  });

  const result = CreateSingleNeuronContextSchema.safeParse(payload);
  const disabled = mutate.isPending || !!result.error;

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
        active={step === BuildStep.MModel}
        onClick={() => onStepChange(BuildStep.MModel)}
      >
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="flex-shrink-0 font-bold">M-model</div>
          {sessionValue?.mmodel ? (
            <Tooltip>
              <TooltipTrigger>
                <div className="text-accent-light flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  <CheckCircleFilled className="flex-shrink-0 text-base" />
                  <div
                    title={sessionValue.mmodel.name}
                    aria-label={sessionValue.mmodel.name}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {sessionValue?.mmodel.name}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={4} avoidCollisions arrowClassName="bg-primary-9">
                <p className={cn('text-justify text-base')}>{sessionValue?.mmodel.name}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="text-neutral-4 group-hover:text-label flex-1 self-end text-right text-sm leading-7">
              Select M-model
            </div>
          )}
          <RightOutlined
            className={cn('text-neutral-4 group-hover:text-label mr-2 transition-all', {
              '-rotate-180 text-white!': step === BuildStep.MModel,
            })}
          />
        </div>
      </Button>
      <Button
        rounded
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        className={cn('group w-full justify-start pr-2 shadow-md')}
        active={step === BuildStep.EModel}
        onClick={() => onStepChange(BuildStep.EModel)}
      >
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="flex-shrink-0 font-bold">E-model</div>
          {sessionValue?.emodel ? (
            <Tooltip>
              <TooltipTrigger>
                <div className="text-accent-light flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  <CheckCircleFilled className="flex-shrink-0 text-base" />
                  <div
                    title={sessionValue.emodel.name}
                    aria-label={sessionValue.emodel.name}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {sessionValue?.emodel.name}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={4} avoidCollisions arrowClassName="bg-primary-9">
                <p className={cn('text-justify text-base')}>{sessionValue?.emodel.name}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="text-neutral-4 group-hover:text-label flex-1 self-end text-right text-sm leading-7">
              Select E-model
            </div>
          )}
          <RightOutlined
            className={cn('text-neutral-4 group-hover:text-label mr-2 transition-all', {
              '-rotate-180 text-white!': step === BuildStep.EModel,
            })}
          />
        </div>
      </Button>
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
              <div className="flex-shrink-0 font-bold">Build model</div>
              {mutate.isPending && <LoadingOutlined className="ml-2 text-white" />}
            </Button>
          </div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent sideOffset={10} arrowClassName="bg-primary-9">
            <p className={cn('text-justify text-base')}>
              Please fill all the required information <br /> along with selecting m-model and
              e-model
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}
