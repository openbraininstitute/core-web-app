import { CaretRightOutlined, DownOutlined } from '@ant-design/icons';
import { useReducer } from 'react';
import { Form } from 'antd';

import useBuildSingleNeuronSynaptomeSessionState from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import Header from '@/features/entities/single-neuron-synaptome/build/elements/basic-header';
import { classNames } from '@/util/utils';

import type { SynaptomeModelConfiguration } from '@/types/synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  stateId: string;
};

export default function ConfigStepHeader(props: Props) {
  const { phase } = useBuildSingleNeuronSynaptomeSessionState(props);
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
          <div>{name}</div>
          <CaretRightOutlined />
        </div>
        <div
          className={classNames(
            'flex w-fit items-center gap-2 tracking-wide uppercase',
            phase === 'me-model' ? 'text-primary-8 flex' : 'text-neutral-4',
            phase === 'basic' && 'hidden'
          )}
        >
          <div>select single neuron</div>
          {phase === 'me-model' ? (
            <DownOutlined onClick={onToggleBasicConfig} />
          ) : (
            <CaretRightOutlined />
          )}
        </div>

        <div
          className={classNames(
            'flex w-fit items-center gap-2 tracking-wide uppercase',
            phase === 'placement' ? 'text-primary-8 flex' : 'text-neutral-4 hidden'
          )}
        >
          <div>configure model</div>
          {phase === 'placement' ? (
            <DownOutlined onClick={onToggleBasicConfig} />
          ) : (
            <CaretRightOutlined />
          )}
        </div>
      </div>
      <Header
        show={openBasicConfig}
        virtualLabId={props.virtualLabId}
        projectId={props.projectId}
      />
    </div>
  );
}
