'use client';

import { isNil } from 'es-toolkit/compat';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import EmptyCircleIcon from '@/components/icons/EmptyCircle';
import FullCircleIcon from '@/components/icons/FullCircle';
import PartialCircleIcon from '@/components/icons/PartialCircle';
import TriangleIcon from '@/components/icons/Triangle';
import { ActivityDict } from '@/ui/segments/workflows/elements/helpers';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

export const StatusMap: Record<string, { class: string; icon: ReactNode; title: string }> = {
  started: {
    class: 'text-primary-2',
    icon: <EmptyCircleIcon className="mr-2" />,
    title: 'Started',
  },
  failure: {
    class: 'text-error',
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'failure',
  },
  success: {
    class: 'text-secondary-5',
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Success',
  },
  initialized: {
    class: 'text-white',
    icon: <EmptyCircleIcon className="mr-2 text-current" />,
    title: 'Initialized',
  },
  processing: {
    class: 'text-primary-2',
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Processing',
  },
  running: {
    class: 'text-primary-2',
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Running',
  },
  error: {
    class: 'text-error',
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Error',
  },
  done: {
    class: 'text-secondary-5',
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Done',
  },
  created: {
    class: 'text-secondary-5',
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Created',
  },
  default: {
    class: 'text-primary-8',
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Done',
  },
};

export const Scales: Partial<
  Record<
    TExtendedEntitiesTypeDict,
    {
      title: string;
      build: TExtendedEntitiesTypeDict | null;
      simulate: TExtendedEntitiesTypeDict | null;
      link: 'explore' | 'workflows';
    }
  >
> = {
  [ExtendedEntitiesTypeDict.Memodel]: {
    title: 'Single neuron',
    build: ExtendedEntitiesTypeDict.Memodel,
    simulate: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    link: 'explore',
  },
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: {
    title: 'Synaptome',
    build: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    simulate: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    link: 'explore',
  },
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: {
    title: 'Small microcircuits',
    build: null,
    simulate: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    link: 'workflows',
  },
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: {
    title: 'Paired neuron circuits',
    build: null,
    simulate: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    link: 'workflows',
  },
};

// here the function should return the available activities for the scale as build , simulate
export const getScaleArray = (): Array<{ label: string; value: TExtendedEntitiesTypeDict }> => {
  return Object.entries(Scales).map(([key, value]) => {
    return {
      label: value.title,
      value: key as TExtendedEntitiesTypeDict,
    };
  });
};

export const getScaleAvailableActivities = (
  scaleType: TExtendedEntitiesTypeDict
): Array<{ label: string; value: TActivityValue }> => {
  const scale = Scales[scaleType];
  if (!scale) {
    return [];
  }

  const availableActivities: Array<{ label: string; value: TActivityValue }> = [];

  if (!isNil(scale.build)) {
    const buildActivity = ActivityDict.find((activity) => activity.value === 'build');
    if (buildActivity) {
      availableActivities.push({
        label: buildActivity.label,
        value: buildActivity.value as TActivityValue,
      });
    }
  }

  if (!isNil(scale.simulate)) {
    const simulateActivity = ActivityDict.find((activity) => activity.value === 'simulate');
    if (simulateActivity) {
      availableActivities.push({
        label: simulateActivity.label,
        value: simulateActivity.value as TActivityValue,
      });
    }
  }

  return availableActivities;
};
