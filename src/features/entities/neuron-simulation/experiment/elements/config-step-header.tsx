import { CaretRightOutlined, DownOutlined } from '@ant-design/icons';
import { useReducer } from 'react';
import { Form } from 'antd';

import BasicConfigurationHeader from '@/features/entities/neuron-simulation/experiment/elements/header';
import { classNames } from '@/util/utils';

import type { SimulationConfigSteps } from '@/features/entities/neuron-simulation/experiment/elements/types';
import type { SynaptomeModelConfiguration } from '@/types/synaptome';

type Props = {
  configStep: SimulationConfigSteps;
};

export default function ConfigStepHeader({ configStep }: Props) {
  const { getFieldValue } = Form.useFormInstance<SynaptomeModelConfiguration>();
  const [openBasicConfig, onToggleBasicConfig] = useReducer((val) => !val, false);
  const name = getFieldValue('name');

  return (
    <div className="sticky top-0 left-0 w-full">
      <div
        className={classNames(
          'flex w-full items-center gap-4 px-10 py-4',
          !openBasicConfig && 'border-neutral-2 border-b'
        )}
      >
        <div className="flex w-fit items-center gap-2 tracking-wide text-gray-400 uppercase">
          <div>Experiment</div>
          <CaretRightOutlined />
        </div>
        <div
          className={classNames(
            'flex w-fit items-center gap-2 tracking-wide uppercase',
            configStep === 'simulation-config' ? 'text-primary-8 flex' : 'text-neutral-4 hidden'
          )}
        >
          <div className="font-bold">{name}</div>
          {configStep === 'simulation-config' ? (
            <DownOutlined onClick={onToggleBasicConfig} />
          ) : (
            <CaretRightOutlined />
          )}
        </div>
      </div>
      {openBasicConfig && <BasicConfigurationHeader />}
    </div>
  );
}
