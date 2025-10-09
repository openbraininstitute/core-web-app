'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Form, Select } from 'antd';
import { useAtom } from 'jotai';
import { Color } from 'three';
import {
  EyeInvisibleOutlined,
  LoadingOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import find from 'lodash/find';

import { FrequencyFormItem } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome/item/frequency-input';
import { OptionRender } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome/item/config-list-render';
import { ConfigInputList } from '@/ui/segments/workflows/simulate/single-neuron/single-neuron-synaptome/item/config-input';
import { SynaptomeConfigurationAtomFamily } from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { SynapseTypeDictionary } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { DefaultColor } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { createBubblesInstanced } from '@/services/bluenaas-single-cell/renderer-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { getSingleNeuronSynaptomePlacement } from '@/api/small-scale-simulator';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY,
  SectionTargetMapping,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { useAppNotification } from '@/components/notification';
import { synapsesPlacementAtom } from '@/state/synaptome';
import {
  sendDisplaySynapses3DEvent,
  sendRemoveSynapses3DEvent,
} from '@/components/neuron-viewer/hooks/events';
import { Button } from '@/ui/molecules/button';
import { getSession } from '@/authFetch';
import { tryCatch } from '@/api/utils';
import { cn } from '@/utils/css-class';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { UpdateSynapseSimulationProperty } from '@/types/small-scale-simulator/single-neuron';
import type { SynapsesConfiguration } from '@/types/synaptome';
import type { SectionSynapses } from '@/state/synaptome';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  meModelId: string;
  index: number;
  formName: string;
  onChange: (change: UpdateSynapseSimulationProperty) => void;
  removeForm: () => void;
  synapsesConfiguration: SynapsesConfiguration;
  placementConfig: TSingleNeuronSynaptomeConfiguration;
  sessionId: string;
};

export function SynapticInputItem({
  index,
  meModelId,
  formName,
  onChange,
  removeForm,
  synapsesConfiguration,
  placementConfig,
  sessionId,
}: Props) {
  const breakpoint = useDefaultBreakpoint();
  const { error: notifyError } = useAppNotification();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [synapseDisplayed, setSynapseDisplayed] = useState(false);
  const [visualizeLoading, setLoadingVisualize] = useState(false);
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(synapsesPlacementAtom);
  const key = getSessionKey(PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY, sessionId);

  const [state] = useAtom(SynaptomeConfigurationAtomFamily(key));
  const synapseWithFrequencyStep = state.findIndex((s) => Array.isArray(s.frequency));
  const abortController = useRef(new AbortController());

  const color = placementConfig?.color;

  const onVisualizationError = () => {
    notifyError({
      message: `There was an error when visualizing synaptic input ${index + 1}.`,
      placement: 'topRight',
    });
  };

  const options = synapsesConfiguration.synapses.map((op) => ({
    label: op.name,
    value: op.id,
    target: SectionTargetMapping[op.target as keyof typeof SectionTargetMapping],
    type: find(Object.values(SynapseTypeDictionary), { value: 110 })?.id,
    distribution: op.formula,
    isFormula: 'formula',
    color: op.color ?? DefaultColor,
  }));

  const onHideSynapse = () => {
    setSynapseDisplayed(false);
    const currentSynapsesPlacementConfig = synapsesPlacement?.[`${index}`];
    if (currentSynapsesPlacementConfig && currentSynapsesPlacementConfig.meshId) {
      sendRemoveSynapses3DEvent(`${index}`, currentSynapsesPlacementConfig.meshId);
      setSynapsesPlacementAtom({
        ...synapsesPlacement,
        [`${index}`]: {
          ...currentSynapsesPlacementConfig,
          count: undefined,
          meshId: undefined,
        },
      });
    }
  };

  const onVisualize = async () => {
    setLoadingVisualize(true);
    onHideSynapse();

    try {
      const session = await getSession();
      if (!session?.accessToken) {
        throw new Error('No session found');
      }

      abortController.current = new AbortController();
      const { data, error } = await tryCatch(
        getSingleNeuronSynaptomePlacement({
          modelId: meModelId,
          payload: {
            seed: placementConfig?.seed!,
            config: placementConfig!,
          },
          signal: abortController.current.signal,
          ctx: { virtualLabId, projectId },
        })
      );
      if (error) {
        return onVisualizationError();
      }

      const result: { synapses: Array<SectionSynapses> } = data;

      const synapsePositions = result.synapses
        .flat()
        .flatMap((p) => p.synapses)
        .map((o) => o.coordinates);

      const mesh = createBubblesInstanced(synapsePositions, new Color(color));

      sendDisplaySynapses3DEvent(`${index}`, mesh);

      setSynapsesPlacementAtom({
        ...synapsesPlacement,
        [`${index}`]: {
          sectionSynapses: result.synapses,
          count: synapsePositions.length,
          meshId: mesh.uuid,
          synapsePlacementConfigId: placementConfig?.id!,
        },
      });
      setSynapseDisplayed(true);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        return onVisualizationError();
      }
    } finally {
      setLoadingVisualize(false);
    }
  };

  const onIdChange = (newValue: string) => {
    onHideSynapse();
    onChange({
      id: index,
      key: 'id',
      newValue,
    });
  };

  useEffect(() => {
    return () => {
      abortController.current.abort();
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-start justify-start gap-1.5">
      <div
        id={`synaptic-input-${index}`}
        className="flex w-full min-w-max items-center justify-between gap-2 text-lg font-bold"
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'bg-primary-8 flex h-12 w-12 items-center justify-center rounded-full',
                'text-center align-middle font-bold text-white'
              )}
            >
              {index + 1}
            </div>
            <span className="text-neutral-3 font-light uppercase">Synaptic input</span>
          </div>
          <div className="flex items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  rounded
                  type="button"
                  aria-label={synapseDisplayed ? 'Hide synapses' : 'Show synapses'}
                  title={synapseDisplayed ? 'Hide synapses' : 'Show synapses'}
                  variant="outline"
                  onClick={synapseDisplayed ? onHideSynapse : onVisualize}
                  disabled={visualizeLoading}
                  className="text-primary-9 group h-12 w-12"
                >
                  {/* eslint-disable-next-line no-nested-ternary */}
                  {synapseDisplayed ? (
                    <EyeInvisibleOutlined className="group-hover:text-primary-6 h-8 w-8 px-2 text-current" />
                  ) : visualizeLoading ? (
                    <LoadingOutlined className="group-hover:text-primary-6 h-8 w-8 px-2 text-current" />
                  ) : (
                    <EyeOutlined className="text-curren group-hover:text-primary-6 h-8 w-8 px-2" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={0}
                className="text-primary-9 bg-white shadow-lg select-none"
                arrowClassName="bg-white"
              >
                {synapseDisplayed ? 'Hide synapses' : 'Show synapses'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  rounded
                  aria-label={`Delete synaptic input ${index}`}
                  type="button"
                  title="Delete synapses"
                  variant="outline"
                  className="text-primary-9 h-12 w-12 hover:text-white"
                >
                  <DeleteOutlined />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={5}
                className="text-primary-9 flex max-w-60 flex-col items-center justify-center gap-2 bg-white shadow-lg select-none"
                arrowClassName="bg-white"
              >
                <p className="text-primary-9 text-justify text-sm">
                  Are you sure you want to delete this synaptic input configuration?
                </p>
                <Button
                  onClick={() => {
                    removeForm();
                    abortController.current.abort();
                  }}
                  className="self-end"
                >
                  Confirm
                </Button>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="border-neutral-2 flex w-full flex-col rounded-2xl border px-5 pt-2 pb-4">
        <div className="flex flex-col">
          <Form.Item
            label={label('synapse group', true)}
            name={[formName, 'id']}
            rules={[{ required: true, type: 'string' }]}
            labelAlign="left"
          >
            <Select
              showSearch
              placeholder="Select synapse set"
              onChange={onIdChange}
              options={options}
              className={cn(
                'border-neutral-3! rounded-md border-[1px]!',
                '[&_.ant-select-selection-item]:text-primary-9! [&_.ant-select-selection-item]:font-bold',
                '[&_.ant-select-selection-placeholder]:text-base! [&_.ant-select-selection-placeholder]:font-light!',
                '[&_.ant-select-selector]:rounded-md! [&_.ant-select-selector]:border-none! [&_.ant-select-selector]:shadow-none!'
              )}
              popupClassName={cn(
                '[&_.ant-select-item-option-content]:text-primary-9!',
                '[&_.rc-virtual-list-holder-inner]:gap-1'
              )}
              placement="bottomLeft"
              size={breakpoint === 'l' ? 'middle' : 'large'}
              optionRender={OptionRender}
              prefix={<div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />}
            />
          </Form.Item>
        </div>
        <ConfigInputList index={index} formName={formName} onChange={onChange} />
        <FrequencyFormItem
          index={index}
          formName={formName}
          onChange={onChange}
          simIndexWithVariableFrequency={synapseWithFrequencyStep}
          sessionId={sessionId}
        />
      </div>
    </div>
  );
}
