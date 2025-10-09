import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { Form } from 'antd';
import sample from 'lodash/sample';

import { SynapticInputItem } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome/item/item';
import { getSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { SimulationColors } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { sendRemoveSynapses3DEvent } from '@/components/neuron-viewer/hooks/events';
import {
  SynaptomeConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  getDefaultSynapseConfig,
  getSessionKey,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
  PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { SynapseConfiguration } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';

type Props = {
  sessionId: string;
  memodelId: string;
  synaptome: ISingleNeuronSynaptome;
};

export type UpdateSynapseSimulationProperty = {
  id: number;
  key: keyof SynapseConfiguration;
  newValue: number | string | number[] | null;
};

export function SynapticsConfiguration({ sessionId, memodelId, synaptome }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const key = getSessionKey(PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const spcKey = getSessionKey(PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const { virtualLabId, projectId } = useWorkspace();
  const [visualizedSynaptomes] = useAtom(synapsesPlacementAtom);
  const [state, update] = useAtom(SynaptomeConfigurationAtomFamily(key));
  const [stimulationState, updateStimulation] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const ref = useRef<boolean | null>(null);
  const [form] = Form.useForm<{ synapses: Array<SynapseConfiguration> }>();

  const { data, isLoading } = useQuery({
    queryKey: keyBuilder.synaptomeConfiguration({
      virtualLabId,
      projectId,
      entityId: synaptome.id,
    }),
    queryFn: () => getSingleNeuronSynaptomeConfiguration(synaptome, { virtualLabId, projectId }),
  });

  const placementConfigForForm = (
    simFormIndex: number
  ): TSingleNeuronSynaptomeConfiguration | undefined => {
    const simConfigForForm = state.find((_: SynapseConfiguration, ind) => ind === simFormIndex);
    return data?.synapses.find((s) => s.id === simConfigForForm?.id);
  };

  const onRemoveSynapseConfig = (_key: number) => {
    const safeStorage = typeof window !== 'undefined' ? sessionStorage : null;
    if (safeStorage) {
      state.forEach((_, index) => {
        const frequencyKey = getSessionKey(
          PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
          `${sessionId}_${index}`
        );
        safeStorage.removeItem(frequencyKey);
      });
    }

    update(state.filter((_, index) => index !== _key) ?? []);
  };

  const onConfigProperty = ({ id, key: configKey, newValue }: UpdateSynapseSimulationProperty) => {
    let color = placementConfigForForm(id)?.color!;
    if (configKey === 'id') {
      color = data?.synapses.find(
        (sc: TSingleNeuronSynaptomeConfiguration) => sc.id === newValue
      )?.color!;
    }

    const updatedState = state.map((s, ind) =>
      ind === id
        ? {
            ...s,
            [configKey]: newValue,
            color,
          }
        : s
    );

    update(updatedState);

    if (configKey === 'frequency') {
      const hasFrequencyStepper = updatedState.some((s) => Array.isArray(s.frequency));
      const protocol = stimulationState.stimulus.stimulus_protocol;

      if (hasFrequencyStepper) {
        const constantAmplitude =
          // eslint-disable-next-line no-nested-ternary
          stimulationState.stimulus.amplitudes &&
          !Array.isArray(stimulationState.stimulus.amplitudes)
            ? stimulationState.stimulus.amplitudes
            : protocol
              ? PROTOCOL_DETAILS[protocol].defaults.current.min
              : 0;

        updateStimulation({
          ...stimulationState,
          stimulus: {
            ...stimulationState.stimulus,
            amplitudes: constantAmplitude,
          },
        });
      }
    }
  };

  function newConfig(config: Array<TSingleNeuronSynaptomeConfiguration>) {
    const defaultSynapseConfig = getDefaultSynapseConfig(config);
    if (defaultSynapseConfig) {
      const nextConfig = {
        ...defaultSynapseConfig,
        color:
          defaultSynapseConfig.color ?? sample(SimulationColors) ?? SimulationColors[state.length],
      } as SynapseConfiguration;

      // Update global state
      update([...(state || []), nextConfig]);

      // Append into AntD Form.List without exposing the whole state
      const currentFormSynapses =
        (form.getFieldValue('synapses') as Array<SynapseConfiguration>) || [];
      form.setFieldsValue({ synapses: [...currentFormSynapses, nextConfig] });
    }
  }

  useEffect(() => {
    if (data && !isLoading && !ref.current) {
      if (state.length) {
        form.setFieldsValue({ synapses: state });
      } else {
        newConfig(data.synapses);
      }
      ref.current = true;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <LoadingOutlined spin />
        <div>Loading synaptome configuration</div>
      </div>
    );
  }

  return (
    <div
      id="synaptic-inputs-container"
      data-testid="synaptic-inputs-container"
      className="secondary-scrollbar mb-4 flex h-full w-full flex-col overflow-x-hidden overflow-y-auto pr-2 pl-5 select-none"
    >
      <Form
        scrollToFirstError
        form={form}
        layout="vertical"
        requiredMark={false}
        key={key}
        className={cn(
          'bg-background relative flex w-full flex-col items-start select-none',
          '[&_.ant-form-item-explain-error]:text-sm [&_.ant-form-item-label]:pb-0.5!'
        )}
        validateTrigger={['onChange']}
        name="synaptic-inputs-configuration"
        data-testid="synaptic-inputs-configuration"
      >
        <Form.List name="synapses">
          {(fields, { remove }) => {
            return (
              <div className="flex w-full flex-col items-start justify-start gap-4">
                {fields.map((field) => {
                  const formName = `${field.name}`;
                  const meshForForm = visualizedSynaptomes?.[formName]?.meshId;
                  return (
                    <SynapticInputItem
                      key={field.key}
                      index={field.name}
                      meModelId={memodelId}
                      synapsesConfiguration={data ?? { synapses: [] }}
                      formName={`${field.name}`}
                      placementConfig={placementConfigForForm(field.name)!}
                      removeForm={() => {
                        remove(field.name);
                        onRemoveSynapseConfig(field.name);
                        if (meshForForm) {
                          sendRemoveSynapses3DEvent(formName, meshForForm);
                        }
                      }}
                      onChange={onConfigProperty}
                      sessionId={sessionId}
                    />
                  );
                })}
                <div className="bg-background sticky right-0 bottom-0 flex w-full py-3">
                  <Button
                    rounded
                    type="button"
                    variant="outline"
                    size={breakpoint === 'l' ? 'md' : 'lg'}
                    onClick={() => {
                      if (data?.synapses.length) {
                        newConfig(data.synapses);
                      }
                    }}
                  >
                    Add synaptic input
                  </Button>
                </div>
              </div>
            );
          }}
        </Form.List>
      </Form>
    </div>
  );
}
