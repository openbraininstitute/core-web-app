import type { ReactNode } from 'react';

import PartialCircleIcon from '@/components/icons/PartialCircle';
import EmptyCircleIcon from '@/components/icons/EmptyCircle';
import FullCircleIcon from '@/components/icons/FullCircle';
import TriangleIcon from '@/components/icons/Triangle';

import type { SingleNeuronSimulationStatus } from '@/api/entitycore/types/shared/neuron-simulation';
import type { Status } from '@/features/activity-view/types';

export const statusToColorMap: { [key in Status | Partial<SingleNeuronSimulationStatus>]: string } =
  {
    started: 'text-primary-2',
    failure: 'text-error',
    success: 'text-secondary-5',
    initialized: 'text-white',
    processing: 'text-primary-2',
    running: 'text-primary-2',
    error: 'text-error',
    done: 'text-secondary-5',
    default: 'text-light',
    created: 'text-secondary-5',
  };

export const statusToIcon: {
  [key in Status | Partial<SingleNeuronSimulationStatus>]: ReactNode | null;
} = {
  initialized: <EmptyCircleIcon className="mr-2" />,
  processing: <PartialCircleIcon className="mr-2" />,
  running: <PartialCircleIcon className="mr-2" />,
  error: <TriangleIcon className="mr-2" />,
  done: <FullCircleIcon className="mr-2" />,
  created: <FullCircleIcon className="mr-2" />,
  started: null,
  failure: null,
  success: null,
  default: null,
};

export const LinkIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.1891 5.55214L13.3543 8.85771C13.5486 9.06056 13.5486 9.38944 13.3543 9.59229L10.1891 12.8979C9.99486 13.1007 9.67994 13.1007 9.48571 12.8979C9.29147 12.695 9.29147 12.3661 9.48571 12.1633L11.8019 9.74442L4.05 9.74442V8.70558H11.8019L9.48571 6.28671C9.29147 6.08386 9.29147 5.75498 9.48571 5.55213C9.67994 5.34929 9.99486 5.34929 10.1891 5.55214Z"
      fill="#91D5FF"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M17.1 0.9H0.9V17.1H17.1V0.9ZM0 0V18H18V0H0Z"
      fill="#91D5FF"
    />
  </svg>
);
