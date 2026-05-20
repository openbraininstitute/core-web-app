'use client';

import { isNil } from 'es-toolkit/compat';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import EmptyCircleIcon from '@/components/icons/EmptyCircle';
import FullCircleIcon from '@/components/icons/FullCircle';
import PartialCircleIcon from '@/components/icons/PartialCircle';
import TriangleIcon from '@/components/icons/Triangle';
import { ActivityStatusColorMap } from '@/features/scan-config/constants';
import {
  ActivityValues,
  getActivity,
  getEntityMeta,
  listWorkflows,
} from '@/ui/segments/workflows/config';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

export const StatusMap: Record<
  string,
  { class: string; color: string; icon: ReactNode; title: string }
> = {
  started: {
    class: 'text-[#1890ff]',
    color: ActivityStatusColorMap[ActivityStatus.CREATED],
    icon: <EmptyCircleIcon className="mr-2" />,
    title: 'Started',
  },
  failure: {
    class: 'text-[#f5222d]',
    color: ActivityStatusColorMap[ActivityStatus.ERROR],
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Failure',
  },
  success: {
    class: 'text-[#002766]',
    color: ActivityStatusColorMap[ActivityStatus.DONE],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Success',
  },
  initialized: {
    class: 'text-[#1890ff]',
    color: ActivityStatusColorMap[ActivityStatus.CREATED],
    icon: <EmptyCircleIcon className="mr-2 text-current" />,
    title: 'Initialized',
  },
  pending: {
    class: 'text-[#fa8c16]',
    color: ActivityStatusColorMap[ActivityStatus.PENDING],
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Pending',
  },
  processing: {
    class: 'text-[#fa8c16]',
    color: ActivityStatusColorMap[ActivityStatus.PENDING],
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Processing',
  },
  running: {
    class: 'text-[#389e0d]',
    color: ActivityStatusColorMap[ActivityStatus.RUNNING],
    icon: <PartialCircleIcon className="mr-2 text-current" />,
    title: 'Running',
  },
  error: {
    class: 'text-[#f5222d]',
    color: ActivityStatusColorMap[ActivityStatus.ERROR],
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Error',
  },
  cancelled: {
    class: 'text-[#f5222d]',
    color: ActivityStatusColorMap[ActivityStatus.CANCELLED],
    icon: <TriangleIcon className="mr-2 text-current" />,
    title: 'Cancelled',
  },
  done: {
    class: 'text-[#002766]',
    color: ActivityStatusColorMap[ActivityStatus.DONE],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Done',
  },
  created: {
    class: 'text-[#1890ff]',
    color: ActivityStatusColorMap[ActivityStatus.CREATED],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Created',
  },
  default: {
    class: 'text-[#002766]',
    color: ActivityStatusColorMap[ActivityStatus.DONE],
    icon: <FullCircleIcon className="mr-2 text-current" />,
    title: 'Done',
  },
};

type TScaleActivityMap = {
  title: string;
  build: TExtendedEntitiesTypeDict | null;
  simulate: TExtendedEntitiesTypeDict | null;
  link: 'explore' | 'workflows';
};

function buildScales(): Partial<Record<TExtendedEntitiesTypeDict, TScaleActivityMap>> {
  const scales: Partial<Record<TExtendedEntitiesTypeDict, TScaleActivityMap>> = {};
  const activities = [ActivityValues.Build, ActivityValues.Simulate] as const;

  for (const activity of activities) {
    const workflows = listWorkflows({ activity, sort: 'order' }).filter(
      (workflow) => !workflow.disabled
    );

    for (const workflow of workflows) {
      const scaleType =
        activity === ActivityValues.Build && workflow.isScanConfig
          ? workflow.targetType
          : workflow.sourceType;
      const resolvedScaleType =
        scaleType === 'multiple' ? workflow.targetType : (scaleType as TExtendedEntitiesTypeDict);
      const entity = getEntityMeta(resolvedScaleType);
      const existing = scales[resolvedScaleType];

      scales[resolvedScaleType] = {
        title:
          existing?.title ?? workflow.label ?? entity?.title ?? entity?.label ?? resolvedScaleType,
        build: activity === ActivityValues.Build ? workflow.targetType : (existing?.build ?? null),
        simulate:
          activity === ActivityValues.Simulate ? workflow.targetType : (existing?.simulate ?? null),
        link: existing?.link ?? (workflow.isScanConfig ? 'workflows' : 'explore'),
      };
    }
  }

  return scales;
}

export const Scales = buildScales();

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
    const buildActivity = getActivity('build');
    if (buildActivity) {
      availableActivities.push({
        label: buildActivity.label,
        value: buildActivity.value,
      });
    }
  }

  if (!isNil(scale.simulate)) {
    const simulateActivity = getActivity('simulate');
    if (simulateActivity) {
      availableActivities.push({
        label: simulateActivity.label,
        value: simulateActivity.value,
      });
    }
  }

  return availableActivities;
};
