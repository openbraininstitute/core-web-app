import { useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import { useRouter } from 'next/navigation';
import { Button, Form, FormProps, Input } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

import { label } from '../Label';
import { SimulationType } from '@/types/simulation/common';
import { createSingleNeuronSimulationAtom } from '@/state/simulate/single-neuron-setter';

import GenericButton from '@/components/Global/GenericButton';
import useNotification from '@/hooks/notifications';

import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { messages } from '@/i18n/en/synaptome';
import { queryAtom } from '@/state/explore-section/list-view-atoms';
import { DataType } from '@/constants/explore-section/list-views';
import { ExploreDataScope } from '@/types/explore-section/application';
import { SIMULATION_DATA_TYPE_CONFIG } from '@/constants/explore-section/data-types/simulation-data-types';

export type Props = {
  modelId: string;
  vLabId: string;
  projectId: string;
  simulationType: SimulationType;
  onClose?: () => void;
};

type SimulationForm = {
  name: string;
  description?: string;
};

export default function SaveSimulationModal({
  modelId,
  vLabId,
  projectId,
  simulationType,
  onClose,
}: Props) {
  const { push: navigate } = useRouter();
  const dataType = useMemo(() => {
    const dataTypeFromSimulationType = Object.keys(SIMULATION_DATA_TYPE_CONFIG).find(
      (type) => SIMULATION_DATA_TYPE_CONFIG[type].name === simulationType
    );
    return (dataTypeFromSimulationType ?? DataType.SingleNeuronSynaptomeSimulation) as DataType;
  }, [simulationType]);

  const refreshSimulations = useSetAtom(
    queryAtom({
      dataType,
      dataScope: ExploreDataScope.NoScope,
      virtualLabInfo: { virtualLabId: vLabId, projectId },
      key: projectId + 'simulate' + dataType,
    })
  );

  const [loading, setLoading] = useState(false);
  const createSingleNeuronSimulation = useSetAtom(createSingleNeuronSimulationAtom);
  const { error: errorNotify, success: successNotify } = useNotification();

  const generateSimulationDetailUrl = (simulationId: string) => {
    const vlProjectUrl = generateVlProjectUrl(vLabId, projectId);
    const baseBuildUrl = `${vlProjectUrl}/explore/simulate/${simulationType}/view`;

    return `${baseBuildUrl}/${simulationId}`;
  };

  const saveSimulation: FormProps<SimulationForm>['onFinish'] = async ({ name, description }) => {
    try {
      setLoading(true);
      const savedSimulation = await createSingleNeuronSimulation(
        name,
        description ?? '',
        modelId,
        vLabId,
        projectId,
        simulationType
      );
      successNotify(messages.CreationSimulationSucceed, 7, 'topRight');
      refreshSimulations();
      navigate(generateSimulationDetailUrl(savedSimulation!.id));
    } catch (error) {
      errorNotify('An error encountered when saving simulation', 7, 'topRight');
    } finally {
      onClose?.();
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col py-5 pr-5 pl-10">
      <div className="mb-10 flex items-start justify-between gap-4">
        <div className="flex w-3/4 flex-col gap-3">
          <h2 className="text-primary-8 text-3xl font-extrabold">Save simulation experiment</h2>
          <p className="text-primary-8 text-base font-light">
            Please confirm the name and description for your simulation. This will help you organize
            and find your experiments later.
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
                disabled={loading}
                loading={loading}
              />
            </div>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
