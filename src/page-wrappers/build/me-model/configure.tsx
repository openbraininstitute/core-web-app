'use client';

import { App, Button } from 'antd';
import { useAtomValue, useSetAtom } from 'jotai';
import get from 'lodash/get';
import omit from 'lodash/omit';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import z from 'zod';

import EModelOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/emodel-overview-card';
import MorphologyOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/morphology-overview-card';
// import CustomButton from '@/components/buttons/custom-btn';

import { createMEModel } from '@/api/entitycore/queries';
import { CreateMEModelSchema, ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { tryCatch } from '@/api/utils';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { activityAtomFamily } from '@/features/activity-view/context';
import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { messages } from '@/i18n/en/me-model';
import { OneshotSession } from '@/services/accounting';
import { useEntitiesCountAtom } from '@/services/entitycore/entities-count';
import { runSingleNeuronAnalysis } from '@/services/small-scale-simulator';
import { useRefreshDataAtom } from '@/state/explore-section/list-view-atoms';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { ServiceSubtype } from '@/types/accounting';
import { WorkspaceContextSchema } from '@/types/common';
import { classNames } from '@/util/utils';
import { resolveDataKey } from '@/utils/key-builder';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

const LOW_FUNDS_ERROR_CODE = 'INSUFFICIENT_FUNDS';

const CreateMeModelContextSchema = CreateMEModelSchema.merge(WorkspaceContextSchema);
type TCreateMeModelContext = z.infer<typeof CreateMeModelContextSchema>;

function Header({ stateId, virtualLabId, projectId }: WorkspaceContext & { stateId: string }) {
  const { sessionValue } = useBuildMeModelSessionState({
    stateId,
    virtualLabId,
    projectId,
  });

  const contributors = useAtomValue(virtualLabProjectUsersAtomFamily({ projectId, virtualLabId }))
    ?.data?.users;
  const { mmodel } = sessionValue;
  const { emodel } = sessionValue;
  const fields = [
    {
      className: 'col-span-6',
      title: 'name',
      value: <span className="text-2xl font-bold">{sessionValue.name}</span>,
    },
    {
      className: 'col-span-3 row-span-3',
      title: 'description',
      value: sessionValue.description,
    },
    {
      title: 'brain region',
      value: sessionValue.brainRegion?.name,
    },
    {
      title: 'created by',
      value: <ul>{contributors?.map(({ id, name }) => <li key={id}>{name}</li>)}</ul>,
    },
    {
      title: 'created date',
      value: new Intl.DateTimeFormat('fr-CH').format(new Date()),
    },
    {
      title: 'm-type',
      value: renderEmptyOrValue(renderArray(mmodel?.mtypes?.map((m) => m.pref_label) || [])),
    },
    {
      title: 'e-type',
      value: renderEmptyOrValue(renderArray(emodel?.etypes?.map((m) => m.pref_label) || [])),
    },
  ];

  return (
    <div className="grid max-w-(--breakpoint-2xl) grow grid-cols-6 gap-x-10 gap-y-4 break-words">
      {fields.map(({ className, title, value }) => (
        <div key={title} className={classNames('text-primary-7', className)}>
          <div className="text-neutral-4 uppercase">{title}</div>
          <div className="mt-2">{value}</div>
        </div>
      ))}
    </div>
  );
}

type Props = {
  ctx: WorkspaceContext;
  searchParams: {
    s: string;
    m: string;
    e: string;
  };
};

function CustomButton({
  loading,
  disable,
  className,
  onClick,
  children,
}: {
  loading: boolean;
  disable: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Button
      key="create-project-btn"
      className={classNames(
        className,
        'bg-primary-9 h-14 rounded-none border border-white px-14 text-white',
        'hover:border-primary-8! hover:bg-primary-8! hover:border! hover:font-bold hover:text-white! hover:shadow-xs',
        'disabled:border-gray-400 disabled:bg-white! disabled:text-gray-700! disabled:hover:text-gray-700!',
        'disabled:hover:border-gray-400! disabled:hover:bg-white! disabled:hover:text-gray-700!'
      )}
      type="default"
      size="large"
      htmlType="button"
      disabled={disable}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
export default function Configure({ ctx, searchParams }: Props) {
  const { push: navigate } = useRouter();
  const { notification } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const emodelId = get(searchParams, 'e', undefined);
  const morphologyId = get(searchParams, 'm', undefined);
  const stateId = get(searchParams, 's', undefined);

  const exploreDataKey = resolveDataKey({
    projectId: ctx.projectId,
    section: 'explore',
    entity: MEmodel,
  });

  const refreshEntityCountsToParent = useEntitiesCountAtom();
  const refreshDataAtom = useRefreshDataAtom(exploreDataKey);
  const refreshActivityAtom = useSetAtom(
    activityAtomFamily({
      key: resolveDataKey({
        projectId: ctx.projectId,
        section: 'activity',
        entity: MEmodel,
      }),
      projectId: ctx.projectId,
      virtualLabId: ctx.virtualLabId,
      type: 'memodel',
    })
  );
  const { sessionValue } = useBuildMeModelSessionState({
    stateId: stateId || '',
    virtualLabId: ctx.virtualLabId,
    projectId: ctx.projectId,
  });

  if (!stateId) {
    navigate('./');
    return;
  }

  const showErrorNotification = (error: any, type: 'validation' | 'http') => {
    let message = messages.DefaultErrorMsg;
    if (type === 'http')
      message =
        error?.cause?.error_code === LOW_FUNDS_ERROR_CODE
          ? messages.LowFundsError
          : messages.DefaultErrorMsg;
    else message = messages.ValidationError;

    notification.error({
      duration: 10,
      message,
    });
  };

  const buildMeModel = async () => {
    const body: Partial<TCreateMeModelContext> = {
      virtualLabId: ctx.virtualLabId,
      projectId: ctx.projectId,
      name: sessionValue.name,
      description: sessionValue.description ?? '',
      emodel_id: sessionValue.emodel?.id,
      morphology_id: sessionValue.mmodel?.id,
      species_id: sessionValue.mmodel?.subject.species.id,
      brain_region_id: sessionValue.mmodel?.brain_region.id ?? sessionValue.brainRegion?.id,
      strain_id: sessionValue.mmodel?.subject.strain?.id ?? null,
      validation_status: ValidationStatus.Initialized,
    };
    const { error: validationError, data: validationData } =
      await CreateMeModelContextSchema.safeParseAsync(body);
    if (validationError) {
      showErrorNotification(validationError, 'validation');
      return { data: null, error: validationError, errorType: 'validation' as const };
    }
    const accountingSession = new OneshotSession({
      subtype: ServiceSubtype.SingleCellBuild,
      virtualLabId: ctx.virtualLabId,
      projectId: ctx.projectId,
      count: 1,
    });

    const { data, error } = await tryCatch(
      accountingSession.useWith<IMEModel>(() =>
        createMEModel({
          body: omit(validationData, ['virtualLabId', 'projectId']),
          context: ctx,
        })
      ),
      undefined,
      {
        section: 'build/create-me-model',
        extra: {
          ...validationData,
          virtualLabId: ctx.virtualLabId,
          projectId: ctx.projectId,
        },
      }
    );

    return { data, error, errorType: 'http' as const };
  };

  const onClick = async () => {
    startTransition(async () => {
      const { data, error, errorType } = await buildMeModel();
      if (error || !data) {
        showErrorNotification(error, errorType);
        return;
      }

      try {
        await runSingleNeuronAnalysis({ ctx, modelId: data.id });
      } catch (runAnalysisError) {
        const message = messages.RunAnalysisError;
        notification.error({ message, duration: 20 });
      }

      refreshDataAtom();
      refreshActivityAtom();
      refreshEntityCountsToParent(data.brain_region.id);
      navigate(
        resolveExploreDetailsPageUrl({
          ctx,
          dataType: ExtendedEntitiesTypeDict.Memodel,
          entityId: data.id,
        })
      );
    });
  };

  const validateTrigger = sessionValue.emodel && sessionValue.mmodel && (
    <div className="fixed right-10 bottom-10 flex flex-row gap-4 text-white">
      <CustomButton loading={isPending} disable={isPending} onClick={onClick}>
        {isPending ? 'Creating ME-model' : 'Save'}
      </CustomButton>
    </div>
  );

  return (
    <>
      <div className="m-10 flex flex-col gap-8">
        <Header
          {...{
            stateId,
            virtualLabId: ctx.virtualLabId,
            projectId: ctx.projectId,
          }}
        />
        <div className="flex flex-col gap-4">
          <MorphologyOverviewCard
            reselectLink
            mode={morphologyId ? 'select' : 'summary'}
            data={sessionValue.mmodel}
          />
          <EModelOverviewCard
            reselectLink
            mode={emodelId ? 'select' : 'summary'}
            data={sessionValue.emodel}
          />
        </div>
      </div>
      {validateTrigger}
    </>
  );
}
