import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { SynapseSet } from '@/ui/segments/workflows/build/single-neuron-synaptome/synapse-set-item/synapse-set-item';

import styles from './synapse-configuration.module.css';

type Props = {
  sessionId: string;
};

export function SynapseSetConfiguration({ sessionId }: Props) {
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <SynapseSet sessionId={sessionId} />
        {/* <div className="relative h-full max-h-full flex-1"> */}
        {sessionValue?.memodel?.id && (
          <NeuronViewerContainer
            disableElectrodes
            disableSynapses={false}
            meModelId={sessionValue?.memodel?.id}
            sessionId={sessionId}
          />
        )}
        {/* </div> */}
      </div>
    </div>
  );
}
