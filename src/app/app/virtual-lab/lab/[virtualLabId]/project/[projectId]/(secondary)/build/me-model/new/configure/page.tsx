'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useSetAtom, useAtomValue } from 'jotai';
import { useId, useState, use } from 'react';
import { notification, Spin } from 'antd';

import MorphologyOverviewCard from '@/features/entities/me-model/card-viewers/morphology-overview-card';
import EModelOverviewCard from '@/features/entities/me-model/card-viewers/emodel-overview-card';

import { usePendingValidationModal } from '@/components/build-section/virtual-lab/me-model/pending-validation-modal-hook';
import { useBuildMeModelSessionState } from '@/features/entities/me-model/build/create.state.session';
import { renderArray, renderEmptyOrValue } from '@/entity-configuration/definitions/renderer';
import { virtualLabProjectUsersAtomFamily } from '@/state/virtual-lab/projects';
import { createMEModelAtom } from '@/state/virtual-lab/build/me-model-setter';
import { ExploreDataScope } from '@/types/explore-section/application';
import { queryAtom } from '@/state/explore-section/list-view-atoms';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames } from '@/util/utils';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

const DEFAULT_ERROR_MSG =
  'Something went wrong while creating the ME-model, please try again later';
const LOW_FUNDS_ERROR_MSG =
  'The project does not have enough credits to create a model, please add credits and try again';
const LOW_FUNDS_ERROR_CODE = 'INSUFFICIENT_FUNDS';

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
      value: sessionValue.brainRegion?.title,
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

export default function NewMEModelPage({
  params: urlParams,
}: ServerSideComponentProp<WorkspaceContext, null>) {
  const { projectId, virtualLabId } = use(urlParams);
  const { push: navigate } = useRouter();
  const params = useSearchParams();

  const emodelId = params?.get('e');
  const morphologyId = params?.get('m');
  const stateId = params?.get('s');

  const { sessionValue, removeSessionValue } = useBuildMeModelSessionState({
    stateId: stateId || '',
    virtualLabId,
    projectId,
  });

  if (!stateId) return navigate('./');

  const refreshMeModels = useSetAtom(
    queryAtom({
      dataType: DataType.CircuitMEModel,
      dataScope: ExploreDataScope.NoScope,
      virtualLabInfo: { virtualLabId, projectId },
      key: useId(),
    })
  );

  const createMEModel = useSetAtom(createMEModelAtom);
  const [activeProcess, setActiveProcess] = useState<
    null | 'modelCreation' | 'modelCreationWithValidation'
  >(null);

  const { contextHolder, createModal: createValidationModal } = usePendingValidationModal();

  const showErrorNotification = (error: any) => {
    notification.error({
      duration: 10,
      message:
        error?.cause?.error_code === LOW_FUNDS_ERROR_CODE ? LOW_FUNDS_ERROR_MSG : DEFAULT_ERROR_MSG,
    });
  };

  const fetchFreshAccessToken = async () => {
    const res = await fetch('/api/auth/new-access-token', { method: 'POST' });
    const token = await res.json();
    return token.accessToken;
  };

  const onClickWithValidation = () => {
    setActiveProcess('modelCreationWithValidation');

    createMEModel({ virtualLabId, projectId })
      .then(fetchFreshAccessToken)
      .then((accessToken) => {
        createValidationModal({ virtualLabId, projectId }, accessToken);
        removeSessionValue();
      })
      .catch((err) => showErrorNotification(err))
      .finally(() => setActiveProcess(null));
  };

  const onClickWithoutValidation = () => {
    setActiveProcess('modelCreation');

    createMEModel({ virtualLabId, projectId })
      .then((record) => {
        notification.success({
          duration: 7,
          message: 'ME-model created successfully',
        });
        refreshMeModels();
        removeSessionValue();
        navigate(
          resolveExploreDetailsPageUrl({
            ctx: { virtualLabId, projectId },
            dataType: DataType.CircuitMEModel,
            // @ts-expect-error
            entityId: record.id, // TODO: fix it after add create me model endpoint
          })
        );
      })
      .catch((err) => {
        showErrorNotification(err);
      })
      .finally(() => {
        setActiveProcess(null);
      });
  };

  const validateTrigger = sessionValue.emodel && sessionValue.mmodel && (
    <div className="fixed right-10 bottom-10 flex flex-row gap-4 text-white">
      <button
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
        onClick={onClickWithValidation}
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
      </button>
    </div>
  );

  return (
    <>
      <div className="m-10 flex flex-col gap-8">
        <Header
          {...{
            stateId,
            virtualLabId,
            projectId,
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
