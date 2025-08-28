'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleFilled,
  LoadingOutlined,
  RightOutlined,
  SettingFilled,
} from '@ant-design/icons';
import isNil from 'lodash/isNil';
import { z } from 'zod';

import { DEFAULT_SYNAPSE_VALUE } from '@/features/entities/single-neuron-synaptome/build/elements/synapse-config-form';
import { SynapseSetMenuItems } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-set-menu-item';
import {
  SingleNeuronSynaptomeBaseSchema,
  SingleNeuronSynaptomeConfigurationSchema,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  useBuildSingleNeuronSynaptomeSessionState,
  BuildStepKeys,
  BuildStep,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { createJsonAsset } from '@/api/entitycore/queries/assets';
import { useAppNotification } from '@/components/notification';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { OneshotSession } from '@/services/accounting';
import { ServiceSubtype } from '@/types/accounting';
import { messages } from '@/i18n/en/synaptome';
import { Button } from '@/ui/molecules/button';
import { tryCatch } from '@/api/utils';
import { cn } from '@/utils/css-class';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';

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
  const { replace, push: navigate } = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const step = searchParams.get('step');

  const { sessionValue, setSessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  const onStepChange = (s: BuildStepKeys) => {
    const query = new URLSearchParams(searchParams);
    query.set('step', s);

    replace(
      `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/workflows/build/configure/single-neuron-synaptome?${query.toString()}`
    );
  };

  //   virtualLabId,
  //   projectId,
  //   name: sessionValue.name,
  //   description: sessionValue.description ?? '',
  //   emodel_id: sessionValue.emodel?.id,
  //   morphology_id: sessionValue.mmodel?.id,
  //   species_id: sessionValue.mmodel?.species.id,
  //   brain_region_id: sessionValue.mmodel?.brain_region.id ?? sessionValue.brainRegion?.id,
  //   strain_id: sessionValue.mmodel?.strain?.id ?? null,
  //   validation_status: ValidationStatus.Initialized,
  // };

  // const buildMeModel = async () => {
  //   let validatedPayload: TCreateMeModelContext | null = null;

  //   try {
  //     validatedPayload = await CreateMeModelContextSchema.parseAsync(payload);
  //   } catch (err) {
  //     throw err;
  //   }

  //   const accountingSession = new OneshotSession({
  //     subtype: ServiceSubtype.SingleCellBuild,
  //     virtualLabId,
  //     projectId,
  //     count: 1,
  //   });

  //   const data = await accountingSession.useWith<IMEModel>(() =>
  //     createMEModel({
  //       body: omit(validatedPayload, ['virtualLabId', 'projectId']),
  //       context: { virtualLabId, projectId },
  //     })
  //   );

  //   return data;
  // };

  // const mutate = useMutation({
  //   mutationFn: buildMeModel,
  //   onSuccess: (data) => {
  //     navigate(
  //       `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/view/memodel/${data.id}`
  //     );
  //   },
  //   async onSettled() {
  //     await queryClient.invalidateQueries({
  //       queryKey: [{ context: { key: `${virtualLabId}/${projectId}/explore/memodel/project` } }],
  //     });
  //     await queryClient.invalidateQueries({
  //       queryKey: [
  //         'workspace/activities',
  //         { virtualLabId, projectId, scale: 'memodel', type: 'build', entity: 'memodel' },
  //       ],
  //     });
  //   },
  // });

  // const result = CreateMeModelContextSchema.safeParse(payload);
  // const paths = flatten(flatten(result.error?.issues).map((o) => o.path));

  // const isInfo = intersection(paths, ['name', 'description']).length > 0;
  // const isEmodel = intersection(paths, ['emodel_id']).length > 0;
  // const isMmodel =
  //   intersection(paths, ['brain_region_id', 'morphology_id', 'species_id']).length > 0;

  // const disabled = mutate.isPending || !!result.error;

  const onAdd = () => {
    const id = crypto.randomUUID();
    const queryParams = new URLSearchParams(searchParams);
    queryParams.set('set', id);
    queryParams.set('step', BuildStep.SynapseSet);
    const synapseSetsMap = new Map<string, TSingleNeuronSynaptomeConfiguration>([]);
    synapseSetsMap.set(id, {
      ...DEFAULT_SYNAPSE_VALUE,
      id,
      seed: 100,
    });

    setSessionValue({
      ...sessionValue,
      seed: sessionValue?.seed ?? 100,
      synapseSets: synapseSetsMap,
    });

    replace(`${pathname}?${queryParams.toString()}`);
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
    const validationPromises = Array.from(sessionValue?.synapseSets?.entries() ?? []).map(
      ([, value]) => SingleNeuronSynaptomeConfigurationSchema.safeParseAsync(value)
    );
    const sets = (await Promise.all(validationPromises)).filter((o) => o.success);

    const build = async () => {
      const { data, error } = await tryCatch(
        SingleNeuronSynaptome.api.query.create!({
          context: { virtualLabId, projectId },
          body: {
            brain_region_id: sessionValue?.memodel?.brain_region.id,
            name: sessionValue?.name,
            description: sessionValue?.description || '',
            seed: sessionValue?.seed,
            me_model_id: sessionValue?.memodel?.id,
          },
        })
      );
      if (error) throw new Error(messages.CreateSynaptomeEntityFailed);

      const { data: assetData, error: err } = await tryCatch(
        createJsonAsset({
          ctx: { virtualLabId, projectId },
          entityId: data?.id,
          entityType: SingleNeuronSynaptome.type,
          path: `${SingleNeuronSynaptome.asset.configfile}_${data?.id}`,
          label: SingleNeuronSynaptome.asset.configfile,
          payload: { synapses: sets.map((o) => o.data) },
        })
      );

      if (err) throw new Error(messages.CreateConfigurationAssetFailed);
      return {
        entity: data,
        asset: assetData,
      };
    };

    const accountingSession = new OneshotSession({
      virtualLabId,
      projectId,
      subtype: ServiceSubtype.SynaptomeBuild,
      count: 1,
    });
    const result = await accountingSession.useWith<{
      entity: ISingleNeuronSynaptome;
      asset: IAsset;
    } | null>(build);

    return result;
  };

  const mutate = useMutation({
    mutationFn: buildSynaptome,
    onSuccess: (data) => {
      navigate(
        `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/view/single-neuron-synaptome/${data?.entity.id}`
      );
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
              key: `${virtualLabId}/${projectId}/explore/single-neuron-synaptome/project`,
            },
          },
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          keyBuilder.activities({
            virtualLabId,
            projectId,
            scale: 'single_neuron_synaptome',
            type: 'build',
            entity: 'single_neuron_synaptome',
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
        className={cn('w-full justify-start pr-2! font-bold shadow-md')}
        active={step === BuildStep.Info}
        onClick={() => onStepChange(BuildStep.Info)}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            <SettingFilled
              className={cn('text-neutral-3 mr-2', {
                'text-primary-4!': step === BuildStep.Info,
              })}
            />
            Info
          </div>
          <RightOutlined
            className={cn('text-neutral-4 mr-2', {
              'text-white!': step === BuildStep.Info,
            })}
          />
        </div>
      </Button>
      <div className="text-neutral-3 ml-4 font-light uppercase">Modeling</div>
      <Button
        rounded
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        className={cn('w-full justify-start pr-2 shadow-md')}
        active={step === BuildStep.MEModel}
        onClick={() => onStepChange(BuildStep.MEModel)}
      >
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="flex-shrink-0 font-bold">ME-model</div>
          {sessionValue?.memodel ? (
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
          ) : (
            <div className="text-neutral-4 flex-1 self-end text-right">Select ME-model</div>
          )}
          <RightOutlined
            className={cn('text-neutral-4 mr-2', {
              'text-white!': step === BuildStep.MEModel,
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
                  {!!validSetsCount && <div>{validSetsCount}</div>}
                  <RightOutlined
                    className={cn('text-neutral-4 mr-2', {
                      'text-white!': step === BuildStep.SynapseSet,
                    })}
                  />
                </div>
              </div>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={10} side="bottom">
          <p className={cn('text-justify text-base')}>Please select me model first</p>
        </TooltipContent>
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
                'disabled:bg-neutral-2 disabled:text-neutral-4! w-full justify-center px-10 font-medium!'
              )}
              onClick={() => mutate.mutateAsync()}
              disabled={disabled}
            >
              <div className="flex-shrink-0 font-bold">Build Synaptome</div>
              {mutate.isPending && <LoadingOutlined className="ml-2 text-white" />}
            </Button>
          </div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent sideOffset={10} avoidCollisions collisionPadding={{ left: 25 }}>
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
