'use client';

import { useCallback, useEffect, useState } from 'react';
import { Form, Button, Space, InputNumber } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAtom, useSetAtom } from 'jotai';
import { z } from 'zod';

import sample from 'lodash/sample';

import SynapseSet from '@/features/entities/single-neuron-synaptome/build/elements/synapse-set';
import useNotification from '@/hooks/notifications';

import {
  ISingleNeuronSynaptome,
  SingleNeuronSynaptomeConfigurationSchema,
} from '@/api/entitycore/types/entities/single-neuron-synaptome';
import {
  sendRemoveSynapses3DEvent,
  sendResetSynapses3DEvent,
} from '@/components/neuron-viewer/hooks/events';

import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model';
import { ExploreDataScope } from '@/types/explore-section/application';
import { SIMULATION_COLORS } from '@/constants/simulate/single-neuron';
import { queryAtom } from '@/state/explore-section/list-view-atoms';
import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { createJsonAsset } from '@/api/entitycore/queries/assets';
import { DataType } from '@/constants/explore-section/list-views';
import { classNames, getRandomIntInclusive } from '@/util/utils';
import { selectedSimulationScopeAtom } from '@/state/simulate';
import { synapsesPlacementAtom } from '@/state/synaptome';
import { SimulationType } from '@/types/virtual-lab/lab';
import { OneshotSession } from '@/services/accounting';
import { resolveDataKey } from '@/utils/key-builder';
import { ServiceSubtype } from '@/types/accounting';
import { messages } from '@/i18n/en/synaptome';
import { getSession } from '@/authFetch';
import { tryCatch } from '@/api/utils';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { SynaptomeModelConfiguration } from '@/types/synaptome';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { IMEModel } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';

export const LOW_FUNDS_ERROR_CODE = 'INSUFFICIENT_FUNDS';
export const DEFAULT_SYNAPSE_VALUE: TSingleNeuronSynaptomeConfiguration = {
  id: '',
  name: '',
  target: undefined,
  type: undefined,
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
  const { push: navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [synapsesHasErrors, setSynapsesHasErrors] = useState<Array<(string | number)[]>>([]);
  const { error: notifyError, success: notifySuccess } = useNotification();
  const form = Form.useFormInstance<SynaptomeModelConfiguration>();
  const seed = Form.useWatch<number>('seed', form);
  const watchedSynapses = Form.useWatch<number>('synapses', form);
  const [synapsesPlacement, setSynapsesPlacementAtom] = useAtom(synapsesPlacementAtom);
  const setSimulationScope = useSetAtom(selectedSimulationScopeAtom);

  const refreshSynaptomeModels = useSetAtom(
    queryAtom({
      dataType: DataType.SingleNeuronSynaptome,
      dataScope: ExploreDataScope.NoScope,
      virtualLabInfo: { virtualLabId, projectId },
      key: resolveDataKey({
        ctx: { virtualLabId, projectId },
        scope: 'explore',
        type: EntityTypeEnum.SingleNeuronSynaptome,
      }),
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
      const session = await getSession();
      if (!session) return;

      async function buildSingleNeuronSynaptome() {
        const { data, error } = await tryCatch(
          SingleNeuronSynaptome.api.query.create!({
            context: { virtualLabId, projectId },
            body: {
              brain_region_id: '23a7711a-8133-4876-b7eb-dcd9e87a1613',
              name: values.name,
              description: values.description || '',
              seed: values.seed,
              me_model_id: entity.id,
            },
          })
        );
        if (error) throw error;
        const { data: assetData, error: err } = await tryCatch(
          createJsonAsset({
            ctx: { virtualLabId, projectId },
            entityId: data?.id,
            entityType: SingleNeuronSynaptome.type,
            path: `${SingleNeuronSynaptome.asset.configfile}_${data?.id}`,
            payload: { synapses: values.synapses },
          })
        );
        if (err) throw error;
        return {
          entity: data,
          asset: assetData,
        };
      }

      const accountingSession = new OneshotSession({
        virtualLabId,
        projectId,
        subtype: ServiceSubtype.SynaptomeBuild,
        count: 1,
      });

      const result = await accountingSession.useWith<{
        entity: ISingleNeuronSynaptome;
        asset: IAsset;
      } | null>(() => buildSingleNeuronSynaptome());
      console.log('–– – synapse-config-form.tsx:222 – onConfigurationSubmission – result:', result);

      refreshSynaptomeModels();
      sendResetSynapses3DEvent();
      form.resetFields();
      setSimulationScope(SimulationType.Synaptome);
      notifySuccess(messages.CreationModelSucceed, 7, 'topRight');
      setLoading(false);
      navigate(
        resolveExploreDetailsPageUrl({
          ctx: { virtualLabId, projectId },
          dataType: DataType.SingleNeuronSynaptome,
          entityId: result?.entity.id,
        })
      );
    } catch (error) {
      const errorMessage =
        (error as any)?.cause?.error_code === LOW_FUNDS_ERROR_CODE
          ? messages.LowFundsError
          : messages.CreationModelFailed;
      notifyError(errorMessage, 7, 'topRight', undefined, 'synaptome-config');
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
          className="border-primary-8 text-primary-8"
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
            disabled={loading || Boolean(synapsesHasErrors.length)}
            onClick={onConfigurationSubmission}
          >
            {loading && <LoadingOutlined />}
            <span className="text-lg font-bold">{loading ? 'Saving ...' : 'Save'}</span>
          </button>
        </Space>
      </Form.Item>
    </div>
  );
}
