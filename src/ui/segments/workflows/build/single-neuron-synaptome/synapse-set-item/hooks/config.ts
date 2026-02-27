import { Form } from 'antd';
import { useSearchParams } from 'next/navigation';
import React from 'react';

import { SingleNeuronSynaptomeConfigurationSchema } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import { log } from '@/utils/logger';

import { useBuildSingleNeuronSynaptomeSessionState } from '../../helpers';

import type { Config } from '../types';

export function useConfig(sessionId: string) {
  const [isFormValid, setIsFormValid] = React.useState(false);
  const [form] = Form.useForm<Config>();
  const [config, setConfig] = React.useState<Config | undefined>(undefined);
  const { sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });
  const params = useSearchParams();
  const setId = params.get('set');
  React.useMemo(() => {
    const synapses = sessionValue?.synapseSets;
    const id = setId ?? globalThis.crypto.randomUUID();
    setConfig(
      synapses?.get(id) ?? {
        ...EMPTY_CONFIG,
        seed: sessionValue?.seed ?? 100,
        id,
      }
    );
  }, [setId, sessionValue]);
  React.useEffect(() => {
    if (!config) {
      form.resetFields();
      setIsFormValid(false);
    } else {
      form.setFieldsValue({
        ...config,
        exclusion_rules: config.exclusion_rules ?? undefined,
      });
      validateConfig(config, setIsFormValid);
    }
  }, [config, form]);

  return {
    form,
    isFormValid,
    setId,
    config,
    updateConfig(value: Partial<Config>) {
      setConfig((prev) => ({ ...EMPTY_CONFIG, ...prev, ...value }));
    },
  };
}

const EMPTY_CONFIG: Config = {
  id: '<New Config>',
  color: '#32c14e',
  name: '',
  seed: 100,
  type: 110,
  exclusion_rules: [],
};

async function validateConfig(config: Config, setIsFormValid: (value: boolean) => void) {
  try {
    await SingleNeuronSynaptomeConfigurationSchema.parseAsync(config);
    setIsFormValid(true);
  } catch (err) {
    log('error', 'synapse set validation error', err);
    setIsFormValid(false);
  }
}
