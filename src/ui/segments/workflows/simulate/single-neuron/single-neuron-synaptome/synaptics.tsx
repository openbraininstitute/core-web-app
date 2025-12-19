import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Form } from 'antd';
import sample from 'es-toolkit/compat/sample';
import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useRef } from 'react';
import { getSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import type {
  ISingleNeuronSynaptome,
  TSingleNeuronSynaptomeConfiguration,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { sendRemoveSynapses3DEvent } from '@/components/neuron-viewer/hooks/events';
import { type SectionSynapsesWith3D, synapsesPlacementAtom } from '@/state/synaptome';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { SimulationColors } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import {
  FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
  PROTOCOL_DETAILS,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
  SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  SimulationStatus,
  StimulationConfigurationAtomFamily,
  SynaptomeConfigurationAtomFamily,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  getDefaultSynapseConfig,
  getSessionKey,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import type { SynapseConfiguration } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { SynapticInputItem } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome/item/item';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';
import { getColorFromGeneratedPalette } from '../shared/steps/webgl-neuron-selector/colors';
import { useVisibleSynapsesSetter } from '../shared/steps/webgl-neuron-selector/hooks';

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
  const spcKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const { virtualLabId, projectId } = useWorkspace();
  const [synapsesPlacement] = useAtom(synapsesPlacementAtom);
  const key = getSessionKey(SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);
  const [state, update] = useAtom(SynaptomeConfigurationAtomFamily(key));
  const [stimulationState, updateStimulation] = useAtom(StimulationConfigurationAtomFamily(spcKey));
  const ref = useRef<boolean | null>(null);
  const [form] = Form.useForm<{ synapses: SynapseConfiguration[] }>();
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));
  const { data, isLoading } = useQuery({
    queryKey: keyBuilder.synaptomeConfiguration({
      virtualLabId,
      projectId,
      entityId: synaptome.id,
    }),
    queryFn: () =>
      getSingleNeuronSynaptomeConfiguration(synaptome, {
        virtualLabId,
        projectId,
      }),
  });
  const placementConfigForForm = (
    simFormIndex: number,
  ): TSingleNeuronSynaptomeConfiguration | undefined => {
    const simConfigForForm = state.find((_: SynapseConfiguration, ind) => ind === simFormIndex);
    return data?.synapses.find((s) => s.id === simConfigForForm?.id);
  };
  const onRemoveSynapseConfig = (_key: number) => {
    const safeStorage = typeof window !== 'undefined' ? sessionStorage : null;
    if (safeStorage) {
      state.forEach((_, index) => {
        const frequencyKey = getSessionKey(
          FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY,
          `${sessionId}_${index}`,
        );
        safeStorage.removeItem(frequencyKey);
      });
    }

    update(state.filter((_, index) => index !== _key) ?? []);
  };

  const onConfigProperty = ({ id, key: configKey, newValue }: UpdateSynapseSimulationProperty) => {
    let color = placementConfigForForm(id)?.color!;
    if (configKey === 'id') {
      color = data?.synapses.find((sc: TSingleNeuronSynaptomeConfiguration) => sc.id === newValue)
        ?.color!;
    }

    const updatedState = state.map((s, ind) =>
      ind === id
        ? {
            ...s,
            [configKey]: newValue,
            color,
          }
        : s,
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

  function newConfig(config: TSingleNeuronSynaptomeConfiguration[]) {
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
      const currentFormSynapses = (form.getFieldValue('synapses') as SynapseConfiguration[]) || [];
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

  useViewer3D(form.getFieldValue('synapses') ?? [], synapsesPlacement ?? {}, data);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center">
        <LoadingOutlined spin />
        <div>Loading synaptome configuration</div>
      </div>
    );
  }

  const disableForm =
    simulationStatus?.status === SimulationStatus.LAUNCHED ||
    simulationStatus?.status === SimulationStatus.SAVING;

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
          '[&_.ant-form-item-explain-error]:text-sm [&_.ant-form-item-label]:pb-0.5!',
        )}
        validateTrigger={['onChange']}
        name="synaptic-inputs-configuration"
        data-testid="synaptic-inputs-configuration"
        disabled={disableForm}
      >
        <Form.List name="synapses">
          {(fields, { remove }) => {
            return (
              <div className="flex w-full flex-col items-start justify-start gap-4">
                {fields.map((field) => {
                  const formName = `${field.name}`;
                  const meshForForm = synapsesPlacement?.[formName]?.meshId;
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
                      disableControls={disableForm}
                    />
                  );
                })}
                <div className="bg-background sticky right-0 bottom-0 flex w-full py-3">
                  <Button
                    rounded
                    type="button"
                    variant="outline"
                    className="disabled:bg-neutral-1 disabled:text-label mt-2 mb-1 w-max shadow-sm"
                    size={breakpoint === 'l' ? 'md' : 'lg'}
                    onClick={() => {
                      if (data?.synapses.length) {
                        newConfig(data.synapses);
                      }
                    }}
                    disabled={disableForm}
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

function useViewer3D(
  synapticInputs: SynapseConfiguration[],
  selection: Record<string, SectionSynapsesWith3D | null>,
  data: { synapses: Array<{ id: string; color?: string }> } | null | undefined,
) {
  const update = useVisibleSynapsesSetter();
  useEffect(() => {
    const synapses: {
      color: string;
      data: Float32Array;
    }[] = [];
    for (let index = 0; index < synapticInputs.length; index++) {
      const synapticInput = synapticInputs[index];
      const match = Object.values(selection).find(
        (item) => item?.synapsePlacementConfigId === synapticInput.id,
      );
      if (match) {
        synapses.push({
          color:
            findColor(data?.synapses, synapticInput.id) ??
            synapticInput.color ??
            getColorFromGeneratedPalette(index),
          data: makeData(match.sectionSynapses),
        });
      }
    }
    update(synapses);
  }, [synapticInputs, selection, data, update]);
}

function makeData(
  sections: {
    synapses: Array<{
      coordinates: number[];
    }>;
  }[],
) {
  const data: number[] = [];
  for (const section of sections) {
    for (const { coordinates } of section.synapses) {
      const [x, y, z] = coordinates;
      data.push(x, y, z, 1);
    }
  }
  return new Float32Array(data);
}

function findColor(
  synapses: { id: string; color?: string }[] | undefined,
  id: string,
): string | null | undefined {
  if (!synapses) return null;

  return synapses.find((item) => item.id === id)?.color;
}
