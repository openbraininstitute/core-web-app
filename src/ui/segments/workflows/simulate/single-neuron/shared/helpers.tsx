import range from 'es-toolkit/compat/range';
import round from 'es-toolkit/compat/round';
import z from 'zod';

import { cn } from '@/utils/css-class';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { SynapseConfiguration } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

export const MAX_AMPERAGE_STEPS = 15;

export function calculateRangeOutput(start: number, end: number, step: number) {
  // Input validation to prevent runtime errors
  if (typeof start !== 'number' || typeof end !== 'number' || typeof step !== 'number') {
    throw new Error('calculateRangeOutput requires valid number inputs');
  }
  if (Number.isNaN(start) || Number.isNaN(end) || Number.isNaN(step)) {
    throw new Error('calculateRangeOutput inputs cannot be NaN');
  }
  if (step <= 0) return [];
  if (start === end) return [start];

  let values: number[];

  if (step === 1) {
    values = [(start + end) / 2];
  } else if (step === 2) {
    values = [start, end];
  } else {
    const steps = (end - start) / (step - 1);
    values = [...range(start, end, steps), end];
  }

  return values.map((v) => roundToSignificantFigures(v, 4));
}

export function roundToSignificantFigures(num: number, sigFigs: number) {
  if (num === 0) return 0;
  const multiplier = 10 ** (sigFigs - Math.ceil(Math.log10(Math.abs(num))));
  return round(num * multiplier) / multiplier;
}

export const label = (text: string, required: boolean = false, cls?: string) => (
  <span className={cn('text-label text-sm leading-5 font-light uppercase', cls)}>
    {text} {required && <sup className="text-lg text-red-400">*</sup>}
  </span>
);

export function getSessionKey(prefix: string, sessionId: string) {
  return `${prefix}-${sessionId}`;
}

export const getDefaultSynapseConfig = (
  synapsePlacementConfig?: Array<TSingleNeuronSynaptomeConfiguration>
): SynapseConfiguration | null => {
  if (synapsePlacementConfig) {
    return {
      id: synapsePlacementConfig[0].id,
      config_id: crypto.randomUUID(),
      color: synapsePlacementConfig[0].color,
      delay: 100,
      duration: 2000,
      frequency: 20,
      weight_scalar: 1,
    };
  }
  return null;
};

export const createZodValidator = (schema: z.ZodType<any>, defaultMessage?: string) => {
  return async (_rule: any, value: any) => {
    try {
      await schema.parseAsync(value);
      return Promise.resolve();
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? error.errors[0]?.message
          : defaultMessage || 'Validation failed';
      return Promise.reject(message);
    }
  };
};
