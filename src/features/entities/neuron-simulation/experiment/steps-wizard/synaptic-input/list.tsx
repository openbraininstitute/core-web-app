import { useAtom, useAtomValue } from 'jotai';
import { Form } from 'antd';

import SynapticInputItem from '@/features/entities/neuron-simulation/experiment/steps-wizard/synaptic-input/item';

import { synaptomeSimulationConfigAtom } from '@/state/simulate/categories/synaptome-simulation-config';
import { sendRemoveSynapses3DEvent } from '@/components/neuron-viewer/hooks/events';
import { useSynaptomeSimulationConfig } from '@/state/simulate/categories';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { classNames } from '@/util/utils';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type {
  SynapseConfig,
  UpdateSynapseSimulationProperty,
} from '@/types/small-scale-simulator/single-neuron';

export default function SynapticInputs({
  meModelId,
  configuration,
}: {
  meModelId: string;
  configuration: {
    synapses: Array<TSingleNeuronSynaptomeConfiguration>;
  };
}) {
  const { newConfig, remove: removeSynapseConfig } = useSynaptomeSimulationConfig();
  const [synapseSimulationAtomState, setSynapseSimState] = useAtom(synaptomeSimulationConfigAtom);
  const visualizedSynaptomes = useAtomValue(synapsesPlacementAtom);

  const placementConfigForForm = (
    simFormIndex: number
  ): TSingleNeuronSynaptomeConfiguration | undefined => {
    const simConfigForForm = synapseSimulationAtomState.find(
      (_: SynapseConfig, ind) => ind === simFormIndex
    );
    return configuration?.synapses.find((s) => s.id === simConfigForForm?.id);
  };

  const setAtomProperty = ({ id, key, newValue }: UpdateSynapseSimulationProperty) => {
    let color = placementConfigForForm(id)?.color!;
    if (key === 'id') {
      color = configuration?.synapses.find(
        (sc: TSingleNeuronSynaptomeConfiguration) => sc.id === newValue
      )?.color!;
    }
    setSynapseSimState(
      synapseSimulationAtomState.map((s, ind) =>
        ind === id
          ? {
              ...s,
              [key]: newValue,
              color,
            }
          : s
      )
    );
  };

  return (
    <Form.List name="synapses">
      {(fields, { remove }) => {
        return (
          <div className="flex flex-col items-start justify-start gap-4">
            {fields.map((field) => {
              return (
                <SynapticInputItem
                  key={`${field.name}`}
                  index={field.name}
                  meModelId={meModelId}
                  synapsesConfiguration={configuration}
                  formName={`${field.name}`}
                  selectedSynapticInputPlacementConfig={placementConfigForForm(field.name)!}
                  removeForm={() => {
                    remove(field.name);
                    removeSynapseConfig(field.name);
                    const formName = `${field.name}`;
                    const meshForForm = visualizedSynaptomes?.[formName]?.meshId;
                    if (meshForForm) {
                      sendRemoveSynapses3DEvent(formName, meshForForm);
                    }
                  }}
                  onChange={setAtomProperty}
                />
              );
            })}
            <button
              className={classNames(
                'border-primary-8 text-primary-8 mt-2 w-max border px-6 py-4 text-lg font-bold',
                'hover:border-neutral-4 hover:bg-neutral-4 hover:text-white'
              )}
              type="button"
              onClick={() => {
                if (configuration?.synapses.length) {
                  newConfig(configuration.synapses);
                }
              }}
            >
              Add synaptic input
            </button>
          </div>
        );
      }}
    </Form.List>
  );
}
