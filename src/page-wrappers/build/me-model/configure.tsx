'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { App, Button } from 'antd';
import omit from 'lodash/omit';
import get from 'lodash/get';
import z from 'zod';

import MorphologyOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/morphology-overview-card';
import EModelOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/emodel-overview-card';

import { usePendingValidationModal } from '@/components/build-section/virtual-lab/me-model/pending-validation-modal-hook';
import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state-session';
import { CreateMEModelSchema, ValidationStatus } from '@/api/entitycore/types/entities/me-model';
import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { createMEModel } from '@/api/entitycore/queries';
import { WorkspaceContextSchema } from '@/types/common';
import { OneshotSession } from '@/services/accounting';
import { ServiceSubtype } from '@/types/accounting';
import { messages } from '@/i18n/en/me-model';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

const LOW_FUNDS_ERROR_CODE = 'INSUFFICIENT_FUNDS';

const CreateMeModelContextSchema = CreateMEModelSchema.merge(WorkspaceContextSchema);
type TCreateMeModelContext = z.infer<typeof CreateMeModelContextSchema>;

function Header({ stateId, virtualLabId, projectId }: WorkspaceContext & { stateId: string }) {
  stateId;
  const { sessionValue } = useBuildMeModelSessionState({
    stateId,
    virtualLabId,
    projectId,
  });

  const contributors = useAtomValue(virtualLabProjectUsersAtomFamily({ projectId, virtualLabId }))
    ?.data?.users;
  const mmodel = sessionValue.mmodel;
  const emodel = sessionValue.emodel;
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
  params: WorkspaceContext;
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
export default function Configure({ params, searchParams }: Props) {
  const { push: navigate } = useRouter();
  const { notification } = App.useApp();
  const [isPending, startTransition] = useTransition();
  const emodelId = get(searchParams, 'e', undefined);
  const morphologyId = get(searchParams, 'm', undefined);
  const stateId = get(searchParams, 's', undefined);

  const { sessionValue } = useBuildMeModelSessionState({
    stateId: stateId || '',
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
  });

  if (!stateId) {
    navigate('./');
    return;
  }

  // const refreshMeModels = useSetAtom(
  //   dataAtom({
  //     dataType: DataType.CircuitMEModel,
  //     dataScope: ExploreDataScope.NoScope,
  //     virtualLabInfo: { virtualLabId: params.virtualLabId, projectId: params.projectId },
  //     key: useId(),
  //   })
  // );

  const [activeProcess, setActiveProcess] = useState<
    null | 'modelCreation' | 'modelCreationWithValidation'
  >(null);

  const { contextHolder, createModal: createValidationModal } = usePendingValidationModal();

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

  const fetchFreshAccessToken = async () => {
    const res = await fetch('/api/auth/new-access-token', { method: 'POST' });
    const token = await res.json();
    return token.accessToken;
  };

  // const onClickWithValidation = () => {
  //   setActiveProcess('modelCreationWithValidation');

  //   createMEModel({ virtualLabId, projectId })
  //     .then(fetchFreshAccessToken)
  //     .then((accessToken) => {
  //       createValidationModal({ virtualLabId, projectId }, accessToken);
  //       removeSessionValue();
  //     })
  //     .catch((err) => showErrorNotification(err))
  //     .finally(() => setActiveProcess(null));
  // };

  const onClickWithoutValidation = async () => {
    setActiveProcess('modelCreation');
    const body: Partial<TCreateMeModelContext> = {
      virtualLabId: params.virtualLabId,
      projectId: params.projectId,
      name: sessionValue.name,
      description: sessionValue.description ?? '',
      emodel_id: sessionValue.emodel?.id,
      morphology_id: sessionValue.mmodel?.id,
      species_id: sessionValue.mmodel?.species.id,
      brain_region_id: sessionValue.mmodel?.brain_region.id ?? sessionValue.brainRegion?.id,
      strain_id: sessionValue.mmodel?.strain?.id ?? null,
      validation_status: ValidationStatus.Initialized,
    };

    const { error: validationError, data: validationData } =
      await CreateMeModelContextSchema.safeParseAsync(body);
    if (validationError) {
      showErrorNotification(validationError, 'validation');
      return;
    }
    const accountingSession = new OneshotSession({
      subtype: ServiceSubtype.SingleCellBuild,
      virtualLabId: params.virtualLabId,
      projectId: params.projectId,
      count: 1,
    });

    startTransition(async () => {
      const { data, error } = await tryCatch(
        accountingSession.useWith<IMEModel>(() =>
          createMEModel({
            body: omit(validationData, ['virtualLabId', 'projectId']),
            context: { virtualLabId: params.virtualLabId, projectId: params.projectId },
          })
        ),
        () => {
          setActiveProcess(null);
        },
        {
          feature: 'create-me-model',
          section: 'build/create-me-model',
          extra: {
            ...validationData,
            virtualLabId: params.virtualLabId,
            projectId: params.projectId,
          },
        }
      );
      if (data) {
        // refreshMeModels();
        navigate(
          resolveExploreDetailsPageUrl({
            ctx: { virtualLabId: params.virtualLabId, projectId: params.projectId },
            dataType: DataType.CircuitMEModel,
            entityId: data.id,
          })
        );
      }
      if (error) {
        showErrorNotification(error, 'http');
        return;
      }
    });
  };

  const validateTrigger = sessionValue.emodel && sessionValue.mmodel && (
    <div className="fixed right-10 bottom-10 flex flex-row gap-4 text-white">
      <CustomButton
        loading={isPending && activeProcess === 'modelCreation'}
        disable={isPending}
        onClick={onClickWithoutValidation}
      >
        {isPending && activeProcess === 'modelCreation' ? 'Creating ME-model' : 'Save'}
      </CustomButton>
      <CustomButton
        loading={isPending && activeProcess === 'modelCreationWithValidation'}
        disable={isPending}
        // onClick={onClickWithValidation}
      >
        Launch validation
      </CustomButton>
      {/* <button
        className={classNames(
          'fit-content ml-auto flex w-fit min-w-40 items-center justify-center p-4 font-bold hover:brightness-110',
          activeProcess ? 'bg-neutral-4' : 'bg-primary-8'
        )}
        onClick={onClickWithoutValidation}
        type="button"
        disabled={!!activeProcess}
      >
        {activeProcess === 'modelCreation' ? (
          <span className="flex flex-row gap-4">
            Creating ME-model <Spin />
          </span>
        ) : (
          'Save'
        )}
      </button>
      <button
        className={classNames(
          'fit-content ml-auto flex w-fit items-center p-4 font-bold hover:brightness-110',
          activeProcess ? 'bg-neutral-4' : 'bg-primary-8'
        )}
        // onClick={onClickWithValidation}
        onClick={() => {}}
        type="button"
        disabled={!!activeProcess}
      >
        {activeProcess === 'modelCreationWithValidation' ? (
          <span className="flex flex-row gap-4">
            Launch validation <Spin />
          </span>
        ) : (
          'Launch validation'
        )}
      </button> */}
    </div>
  );

  return (
    <>
      <div className="m-10 flex flex-col gap-8">
        <Header
          {...{
            stateId,
            virtualLabId: params.virtualLabId,
            projectId: params.projectId,
          }}
        />
        <div className="flex flex-col gap-4">
          <MorphologyOverviewCard
            reselectLink
            mode={!!morphologyId ? 'select' : 'summary'}
            promise={sessionValue.mmodel}
          />
          <EModelOverviewCard
            reselectLink
            mode={!!emodelId ? 'select' : 'summary'}
            promise={sessionValue.emodel}
          />
        </div>
      </div>
      {validateTrigger}
      {contextHolder}
    </>
  );
}
