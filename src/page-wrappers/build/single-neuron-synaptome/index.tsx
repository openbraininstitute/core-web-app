'use client';

import { ConfigProvider, Form } from 'antd';
import { useLayoutEffect } from 'react';
import { useSetAtom } from 'jotai';

import useBuildSingleNeuronSynaptomeSessionState from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import SynaptomePlacementConfiguration from '@/features/entities/single-neuron-synaptome/build/phases/placement-config';
import MeModelsListing from '@/features/entities/single-neuron-synaptome/build/phases/me-model-listing';
import ConfigStepHeader from '@/features/entities/single-neuron-synaptome/build/elements/step-header';
import CreateBaseSynaptome from '@/features/entities/single-neuron-synaptome/build/phases/basic';

import { DEFAULT_SYNAPSE_VALUE } from '@/features/entities/single-neuron-synaptome/build/elements/synapse-config-form';
import { selectedRowsAtom } from '@/state/explore-section/list-view-atoms';

import type { SingleNeuronSynaptomeConfigPhase } from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types';
import type { SynaptomeModelConfiguration } from '@/types/synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  stateId: string;
  // @FIXME: phase and origin are not used in <Configure .../>

  phase: SingleNeuronSynaptomeConfigPhase;

  origin: {
    entity?: ISingleNeuronSynaptome | null;
    config: any;
  };
};

export default function Configure({ virtualLabId, projectId, stateId }: Props) {
  const [form] = Form.useForm();
  const setSelectedRows = useSetAtom(selectedRowsAtom(stateId));
  const { phase, sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    virtualLabId,
    projectId,
    stateId,
  });

  useLayoutEffect(() => {
    if (sessionValue && sessionValue?.selectedRows && sessionValue.selectedRows?.length > 0) {
      setSelectedRows(sessionValue.selectedRows);
    }
  }, [sessionValue, setSelectedRows]);

  return (
    <ConfigProvider theme={{ token: { borderRadius: 0 } }}>
      <Form<SynaptomeModelConfiguration>
        form={form}
        name="synaptome-model-configuration-form"
        className="h-full"
        layout="vertical"
        autoComplete="off"
        requiredMark="optional"
        initialValues={{
          name: sessionValue?.name || undefined,
          description: sessionValue?.description || undefined,
          modelUrl: sessionValue?.selectedRows?.at(0)?.id || undefined,
          seed: 100,
          synapses: [
            {
              ...DEFAULT_SYNAPSE_VALUE,
              id: crypto.randomUUID(),
              seed: 100,
            },
          ],
        }}
      >
        {phase !== 'basic' && <ConfigStepHeader {...{ virtualLabId, projectId, stateId }} />}
        <CreateBaseSynaptome {...{ virtualLabId, projectId, stateId }} />
        <MeModelsListing {...{ virtualLabId, projectId, stateId }} />
        {phase === 'placement' && (
          <SynaptomePlacementConfiguration {...{ virtualLabId, projectId, stateId }} />
        )}
      </Form>
    </ConfigProvider>
  );
}
