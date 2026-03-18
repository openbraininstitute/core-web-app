'use client';

import { useQuery } from '@tanstack/react-query';
import { Form, Input } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import { useSession } from 'next-auth/react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import z from 'zod';
import {
  getSingleNeuronSimulations,
  getSingleNeuronSynaptomeSimulations,
} from '@/api/entitycore/queries';
import type {
  ISingleNeuronSimulation,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { OVERVIEW_CONFIGURATION_SESSION_KEY } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  OverviewConfigurationAtomFamily,
  SimulationStatus,
  simulationStatusAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import {
  getSessionKey,
  label,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import {
  OverviewConfigurationSchema,
  SimulationType,
  type TSimulationType,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { makeDateToAppFormat } from '@/util/date';
import { log } from '@/utils/logger';

type Props = {
  sessionId: string;
  simulationType: TSimulationType;
};

export function Info({ sessionId, simulationType }: Props) {
  const { data } = useSession();
  const [form] = Form.useForm();
  const { virtualLabId, projectId } = useWorkspace();
  const key = getSessionKey(OVERVIEW_CONFIGURATION_SESSION_KEY, sessionId);
  const [state, update] = useAtom(OverviewConfigurationAtomFamily(key));
  const simulationStatus = useAtomValue(simulationStatusAtomFamily(sessionId));

  useEffect(() => {
    form.setFieldsValue({
      name: state.name,
      description: state.description,
    });
    setFormValues({
      name: state.name || '',
      description: state.description || '',
    });
  }, [state, form]);

  const [formValues, setFormValues] = useState({ name: '', description: '' });

  const onValuesChange = (_: any, allValues: any) => {
    setFormValues(allValues);
    try {
      const validatedData = OverviewConfigurationSchema.parse(allValues);
      update(validatedData);
    } catch (error) {
      log('error', error);
    }
  };

  const deferredSearch = useDeferredValue(formValues.name || '');

  const keyAndFn = useMemo(
    () => ({
      [SimulationType.SingleNeuron]: {
        queryKey: keyBuilder.singleNeuronSimulations({
          context: { virtualLabId, projectId },
          props: { name: deferredSearch },
        }),
        queryFn: () =>
          getSingleNeuronSimulations({
            context: { virtualLabId, projectId },
            withFacets: false,
            filters: { name: deferredSearch },
          }),
      },
      [SimulationType.SingleNeuronSynaptome]: {
        queryKey: keyBuilder.singleNeuronSynaptomeSimulations({
          context: { virtualLabId, projectId },
          props: { name: deferredSearch },
        }),
        queryFn: () =>
          getSingleNeuronSynaptomeSimulations({
            context: { virtualLabId, projectId },
            withFacets: false,
            filters: { name: deferredSearch },
          }),
      },
    }),
    [deferredSearch, virtualLabId, projectId]
  );

  const { data: searchResults } = useQuery<
    | EntityCoreResponse<ISingleNeuronSimulation>
    | EntityCoreResponse<ISingleNeuronSynaptomeSimulation>
  >({
    queryKey: keyAndFn[simulationType].queryKey,
    queryFn: keyAndFn[simulationType].queryFn,
    enabled: Boolean(deferredSearch) && !!simulationType,
  });

  const nameExists = searchResults?.data.some(
    (item) => item.name.trim().toLowerCase() === formValues.name.trim().toLowerCase()
  );

  return (
    <Form
      key={key}
      name="single-model-configuration-form"
      className="flex flex-col gap-4 [&_.ant-form-item-explain-error]:text-sm"
      form={form}
      layout="vertical"
      autoComplete="off"
      preserve={false}
      requiredMark={false}
      onValuesChange={onValuesChange}
      validateTrigger="onChange"
      initialValues={{
        name: state.name,
        description: state.description,
      }}
      disabled={
        simulationStatus?.status === SimulationStatus.LAUNCHED ||
        simulationStatus?.status === SimulationStatus.SAVING
      }
    >
      <Form.Item
        hasFeedback
        label={label('name', true)}
        name="name"
        rules={[
          {
            validator: async (_rule, value) => {
              try {
                await OverviewConfigurationSchema.pick({
                  name: true,
                }).shape.name.parseAsync(value);
                return Promise.resolve();
              } catch (error) {
                return Promise.reject(
                  error instanceof z.ZodError ? error.errors.at(0)?.message : 'Name is required'
                );
              }
            },
          },
        ]}
        extra={
          nameExists ? (
            <div className="tex text-sm text-orange-400 select-none">
              <p>This name is already used in one of your simulations. </p>
              <small>
                You can still use it but we recommend choosing a unique name to avoid confusion.
              </small>
            </div>
          ) : null
        }
      >
        <Input
          placeholder="your simulation name"
          size="large"
          className="border-neutral-2! text-primary-8! rounded-sm! font-bold! [&_input]:placeholder:text-sm [&_input]:placeholder:!font-light"
        />
      </Form.Item>
      <Form.Item
        hasFeedback
        label={label('Description', false)}
        name="description"
        rules={[
          {
            validator: async (_rule, value) => {
              try {
                await OverviewConfigurationSchema.pick({
                  description: true,
                }).shape.description.parseAsync(value);
              } catch (error) {
                return Promise.reject(
                  error instanceof z.ZodError ? error.errors.at(0)?.message : 'Invalid description'
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input.TextArea
          rows={5}
          placeholder="your description"
          size="large"
          className="border-neutral-2! text-primary-8! rounded-sm! p-2 [&_textarea]:placeholder:text-sm [&_textarea]:placeholder:!font-light"
        />
      </Form.Item>
      <div className="flex flex-col gap-10 select-none">
        <div className="flex flex-col">
          <div>{label('Registered by', false)}</div>
          <div className="text-neutral-4 font-bold">{data?.user.name ?? data?.user.username}</div>
        </div>
        <div className="flex flex-col">
          <div>{label('Registered at', false)}</div>
          <div className="text-neutral-4 font-bold">
            {makeDateToAppFormat(new Date().toISOString())}
          </div>
        </div>
      </div>
    </Form>
  );
}
