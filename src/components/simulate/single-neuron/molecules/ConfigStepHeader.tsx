import { useReducer } from 'react';
import { Form } from 'antd';
import { CaretRightOutlined, DownOutlined } from '@ant-design/icons';

import { GenericSingleNeuronSimulationConfigSteps } from './types';
import BasicConfigurationHeader from './BasicConfigurationHeader';

import { SynaptomeModelConfiguration } from '@/types/synaptome';
import { classNames } from '@/util/utils';

type Props = {
  configStep: GenericSingleNeuronSimulationConfigSteps;
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
            configStep === 'simulaton-config' ? 'text-primary-8 flex' : 'text-neutral-4 hidden'
          )}
        >
          <div className="font-bold">{name}</div>
          {configStep === 'simulaton-config' ? (
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
