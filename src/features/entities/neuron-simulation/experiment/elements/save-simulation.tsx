import { App, Button, Form, FormProps, Input } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useSetAtom } from 'jotai';
import isNil from 'es-toolkit/compat/isNil';

import GenericButton from '@/components/Global/GenericButton';

import { createSingleNeuronSimulationAtom } from '@/state/simulate/single-neuron-setter';
import { label } from '@/features/entities/neuron-simulation/experiment/elements/label';
import { useRefreshDataAtom } from '@/state/explore-section/list-view-atoms';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { resolveDataKey } from '@/utils/key-builder';
import { messages } from '@/i18n/en/simulation';
import { tryCatch } from '@/api/utils';

import type { SimulationType } from '@/types/small-scale-simulator/common';
import type { WorkspaceContext } from '@/types/common';

export type Props = WorkspaceContext & {
  modelId: string;
  meModelId: string;
  simulationType: SimulationType;
  onClose?: () => void;
};

type SimulationForm = {
  name: string;
  description?: string;
};

export default function SaveSimulationModal({
  modelId,
  meModelId,
  virtualLabId,
  projectId,
  simulationType,
  onClose,
}: Props) {
  const { notification } = App.useApp();
  const { push: navigate } = useRouter();
  const entity = getEntityBySlug({ slug: simulationType });
  const [isPending, startTransition] = useTransition();
  const dataKey = resolveDataKey({
    section: 'simulate',
    projectId,
    entity,
  });

  const refreshDataAtom = useRefreshDataAtom(dataKey);
  const createSingleNeuronSimulation = useSetAtom(createSingleNeuronSimulationAtom);

  const saveSimulation: FormProps<SimulationForm>['onFinish'] = async ({ name, description }) => {
    startTransition(async () => {
      const { data, error } = await tryCatch(
        createSingleNeuronSimulation(
          name,
          description ?? '',
          modelId,
          meModelId,
          virtualLabId,
          projectId,
          simulationType
        )
      );

      if (error || isNil(data)) {
        notification.error({
          message: error?.message ?? messages.CreationSimulationFailed,
          duration: 7,
          placement: 'topRight',
        });
      } else if (data) {
        refreshDataAtom();
        notification.success({
          message: messages.CreationSimulationSucceed,
          duration: 7,
          placement: 'topRight',
        });
        navigate(
          resolveExploreDetailsPageUrl({
            ctx: { virtualLabId, projectId },
            entityId: data.simulation.id,
            dataType: entity?.extendedType,
          })
        );
        onClose?.();
      }
    });
  };

  return (
    <div className="flex flex-col py-5 pr-5 pl-10">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="flex w-3/4 flex-col gap-3">
          <h2 className="text-primary-8 text-3xl font-extrabold">
            {messages.SimulationSaveModalTitle}
          </h2>
          <p className="text-primary-8 text-base font-light">
            {messages.SimulationSaveModalDescription}
          </p>
        </div>
        <CloseOutlined className="text-primary-8 text-2xl" onClick={onClose} />
      </div>
      <div>
        <Form name="simulation" onFinish={saveSimulation}>
          <div className="mb-2">{label('name', 'secondary')}</div>
          <Form.Item
            rules={[{ required: true, message: 'Please provide a name!' }]}
            validateTrigger="onBlur"
            name="name"
          >
            <Input
              placeholder="Simulation name"
              size="large"
              className="border-neutral-3 text-primary-8! rounded-none border-0 border-b! font-bold!"
            />
          </Form.Item>
          <div className="mb-2">{label('Description', 'secondary')}</div>
          <Form.Item name="description">
            <Input.TextArea
              rows={5}
              placeholder="Your description"
              size="large"
              className="border-neutral-3 text-primary-8! rounded-none border p-2 font-bold!"
            />
          </Form.Item>

          <Form.Item>
            <div className="flex items-center justify-end gap-4">
              <Button type="text" onClick={onClose}>
                Cancel
              </Button>
              <GenericButton
                text="Save"
                htmlType="submit"
                className="bg-primary-8 w-max text-white"
                disabled={isPending}
                loading={isPending}
              />
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
