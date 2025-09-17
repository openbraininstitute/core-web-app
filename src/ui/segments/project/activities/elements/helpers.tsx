'use client';

import { ReactNode } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import EmptyCircleIcon from '@/components/icons/EmptyCircle';
import PartialCircleIcon from '@/components/icons/PartialCircle';
import FullCircleIcon from '@/components/icons/FullCircle';
import TriangleIcon from '@/components/icons/Triangle';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const ACTIVITY_DEFAULT_PAGE_SIZE = 5;

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
    title: 'Single neuron synaptome',
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

export const getScaleArray = (): Array<{ label: string; value: TExtendedEntitiesTypeDict }> => {
  return Object.entries(Scales).map(([key, value]) => {
    return {
      label: value.title,
      value: key as TExtendedEntitiesTypeDict,
    };
  });
};
