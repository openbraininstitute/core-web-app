'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { App, Button, Form, InputNumber, Space } from 'antd';
import { useAtom, useSetAtom } from 'jotai';
import sample from 'lodash/sample';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { z } from 'zod';

import useBuildSingleNeuronSynaptomeSessionState from '@/features/entities/single-neuron-synaptome/build/create.state-session';
import SynapseSet from '@/features/entities/single-neuron-synaptome/build/elements/synapse-set';

import { SingleNeuronSynaptomeConfigurationSchema } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { tryCatch } from '@/api/utils';
import {
  sendRemoveSynapses3DEvent,
  sendResetSynapses3DEvent,
} from '@/components/neuron-viewer/hooks/events';
import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { activityAtomFamily } from '@/features/activity-view/context';
import {
  DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
  DEFAULT_BRAIN_REGION_QUERY_ID,
} from '@/features/brain-region-hierarchy/context';
import { messages } from '@/i18n/en/synaptome';
import { useRefreshDataAtom } from '@/state/explore-section/list-view-atoms';
import { selectedSimulationScopeAtom } from '@/state/simulate';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { SimulationType } from '@/types/virtual-lab/lab';
import { classNames, getRandomIntInclusive } from '@/util/utils';
import { resolveDataKey } from '@/utils/key-builder';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IMEModel } from '@/api/entitycore/types';
import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { createSingleNeuronSynaptome } from '@/api/small-scale-simulator';
import type { WorkspaceContext } from '@/types/common';
import type { SynaptomeModelConfiguration } from '@/types/synaptome';

const LOW_FUNDS_ERROR_CODE = 'INSUFFICIENT_FUNDS';
export const DEFAULT_SYNAPSE_VALUE: TSingleNeuronSynaptomeConfiguration = {
  id: '',
  name: '',
  target: undefined,
  type: 110,
  formula: '',
  seed: 100,
  exclusion_rules: null,
  soma_synapse_count: 50,
  color: SIMULATION_COLORS[0],
};

const label = (text: string) => (
  <span className="text-primary-8 text-base font-semibold">{text}</span>
);

type Props = WorkspaceContext & {
  entity: IMEModel;
  stateId: string;
};

const ListSynapsesSchema = z.array(SingleNeuronSynaptomeConfigurationSchema);

export default function SynaptomeConfigurationForm({
  entity,
  stateId,
  virtualLabId,
  projectId,
}: Props) {
  const { notification } = App.useApp();
  const { push: navigate } = useRouter();
  const [loading, setLoading] = useState(false);

  const [synapsesHasErrors, setSynapsesHasErrors] = useState<Array<(string | number)[]>>([]);
  const form = Form.useFormInstance<SynaptomeModelConfiguration>();
  const seed = Form.useWatch<number>('seed', form);
  const watchedSynapses = Form.useWatch<number>('synapses', form);
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(synapsesPlacementAtom);
  const setSimulationScope = useSetAtom(selectedSimulationScopeAtom);
  const [isPending, startTransition] = useTransition();

  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    virtualLabId,
    projectId,
    stateId,
  });
  const dataKey = resolveDataKey({
    section: 'explore',
    projectId,
  });
  const refreshDataAtom = useRefreshDataAtom(dataKey);
  const refreshActivityAtom = useSetAtom(
    activityAtomFamily({
      key: resolveDataKey({
        projectId,
        section: 'activity',
        entity: SingleNeuronSynaptome,
      }),
      projectId,
      virtualLabId,
      type: 'single_neuron_synaptome',
    })
  );
  const addNewSynapse = useCallback(() => {
    const synapses = form.getFieldValue('synapses');
    const id = crypto.randomUUID();
    setSynapsesPlacementAtom({
      ...synapsesPlacement,
      [id]: null,
    });

    form.setFieldValue('synapses', [
      ...(synapses ?? []),
      {
        ...DEFAULT_SYNAPSE_VALUE,
        id,
        seed: seed + getRandomIntInclusive(0, seed),
        color: sample(SIMULATION_COLORS) ?? SIMULATION_COLORS[synapses.length],
      },
    ]);
  }, [form, seed, synapsesPlacement, setSynapsesPlacementAtom]);

  const onSeedChange = useCallback(
    (value: number | null) => {
      if (value) {
        const formSynapses = form.getFieldValue('synapses');
        form.setFieldsValue({
          ...form.getFieldsValue(),
          seed: value,
          synapses: formSynapses.map((c: TSingleNeuronSynaptomeConfiguration) => ({
            ...c,
            seed: value + getRandomIntInclusive(0, value),
          })),
        });
        formSynapses.forEach((c: TSingleNeuronSynaptomeConfiguration) => {
          const mesh = synapsesPlacement?.[c.id]?.meshId;
          if (mesh) {
            sendRemoveSynapses3DEvent(c.id, mesh);
          }
        });
      }
    },
    [form, synapsesPlacement]
  );

  const onConfigurationSubmission = async () => {
    try {
      await form.validateFields({ recursive: true });
    } catch (error) {
      if (
        !(
          'errorFields' in (error as { errorFields: any[] }) &&
          !(error as { errorFields: any[] }).errorFields.length
        )
      ) {
        return false;
      }
    }
    const values = form.getFieldsValue();

    try {
      setLoading(true);

      const buildSingleNeuronSynaptome = async () => {
        const { data, error } = await tryCatch(
          createSingleNeuronSynaptome({
            ctx: { virtualLabId, projectId },
            modelInfo: {
              name: values.name,
              description: values.description || '',
              memodel_id: entity.id,
              seed: values.seed,
              brain_region_id: sessionValue?.selectedRows?.at(0)?.brain_region.id!,
              config: { synapses: values.synapses },
            },
          })
        );
        if (error) throw new Error(messages.CreateSynaptomeEntityFailed);

        return {
          entity: data.data,
        };
      };

      startTransition(async () => {
        try {
          const result = await buildSingleNeuronSynaptome();
          if (result) {
            setLoading(false);
            form.resetFields();
            sendResetSynapses3DEvent();
            setSimulationScope(SimulationType.Synaptome);
            notification.success({
              message: messages.CreationModelSucceed,
              duration: 7,
              placement: 'topRight',
              key: dataKey,
            });
            refreshDataAtom();
            refreshActivityAtom();
            const urlParams = new URLSearchParams();
            urlParams.set(DEFAULT_BRAIN_REGION_QUERY_ID, entity.brain_region.id);
            urlParams.set(
              DEFAULT_BRAIN_REGION_QUERY_ANNOTATION_VALUE,
              String(entity.brain_region.annotation_value)
            );
            const url = resolveExploreDetailsPageUrl({
              ctx: { virtualLabId, projectId },
              dataType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
              entityId: result?.entity.id,
            });

            navigate(`${url}?${urlParams.toString()}`);
          }
        } catch (error) {
          setLoading(false);
          notification.error({
            message: messages.CreationModelFailed,
            description: (error as { message: string })?.message ?? '',
            duration: 7,
            placement: 'topRight',
            key: dataKey,
          });
        }
      });
    } catch (error) {
      const errorMessage =
        (error as any)?.cause?.error_code === LOW_FUNDS_ERROR_CODE
          ? messages.LowFundsError
          : messages.CreationModelFailed;
      notification.error({
        message: errorMessage,
        duration: 7,
        placement: 'topRight',
        key: 'synaptome-config',
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { success, error } = await ListSynapsesSchema.safeParseAsync(watchedSynapses);
      if (success) {
        setSynapsesHasErrors([]);
      } else if (error) {
        setSynapsesHasErrors(error.issues.map((p) => p.path));
      }
    })();
  }, [watchedSynapses]);

  return (
    <div className="relative mb-20 h-full w-full">
      <div className="sticky top-0 mb-5 flex items-center justify-between gap-2">
        <h2 className="text-primary-8 my-3 text-2xl font-bold">
          <span>
            Synapses sets
            <span className="ml-2 text-base font-light">
              {form.getFieldValue('synapses')?.length
                ? `(${form.getFieldValue('synapses').length})`
                : ''}
            </span>
          </span>
        </h2>
        <Form.Item name="seed" rules={[{ required: true, message: 'Please provide a seed!' }]}>
          <div className="flex items-center gap-2">
            {label('Seed')}
            <InputNumber
              name="seed"
              placeholder="Enter a seed "
              className="w-24 max-w-fit"
              size="large"
              onChange={onSeedChange}
              value={form.getFieldValue('seed')}
            />
          </div>
        </Form.Item>
      </div>
      <div className="secondary-scrollbar mb-2 h-full max-h-[calc(100vh-255px)] overflow-y-auto pr-4">
        <Form.List name="synapses" initialValue={['name', 'formula']}>
          {(fields, { remove: removeGroup }) => {
            return fields.map((field, index) => {
              return (
                <SynapseSet
                  key={field.key}
                  {...{
                    field,
                    index,
                    removeGroup,
                    modelId: entity.id,
                    disableApplyChanges: synapsesHasErrors.some((p) => p.includes(index)),
                  }}
                />
              );
            });
          }}
        </Form.List>
        <Button
          htmlType="button"
          aria-label="Add Synapse"
          onClick={addNewSynapse}
          className="border-primary-8 text-primary-8 rounded-none bg-transparent"
          size="large"
        >
          Add new synapses set
        </Button>
      </div>
      <Form.Item className="fixed right-10 bottom-4 my-6">
        <Space className="w-full justify-end">
          <button
            type="submit"
            className={classNames(
              'bg-primary-8 flex items-center justify-between gap-2 px-12 py-4 text-white',
              'disabled:bg-gray-100 disabled:text-gray-400'
            )}
            disabled={loading || isPending || Boolean(synapsesHasErrors.length)}
            onClick={onConfigurationSubmission}
          >
            {loading || (isPending && <LoadingOutlined />)}
            <span className="text-lg font-bold">
              {loading || isPending ? 'Saving ...' : 'Save'}
            </span>
          </button>
        </Space>
      </Form.Item>
    </div>
  );
}
