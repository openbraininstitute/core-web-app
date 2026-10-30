'use client';

import { type TViewVariant, ViewVariant } from '@/constants';
import EModelOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/emodel-overview-card';
import MorphologyOverviewCard from '@/features/entities/me-model/detail-view/card-viewers/morphology-overview-card';
import SimulationResults from '@/features/entities/me-model/detail-view/simulation';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import {
  detailViewLabelClass,
  detailViewValueClass,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  memodel: IMEModel;
  context: WorkspaceContext;
  variant?: TViewVariant;
};

function CalibrationResult({ memodel, variant }: { memodel: IMEModel; variant: TViewVariant }) {
  const calibration = memodel.calibration_result;
  if (!calibration) {
    return (
      <div className={cn('flex h-full items-center justify-center', detailViewValueClass(variant))}>
        No calibration result available
      </div>
    );
  }

  const details = [
    { label: 'Holding current', value: calibration.holding_current, unit: 'nA' },
    { label: 'Threshold current', value: calibration.threshold_current, unit: 'nA' },
  ];

  return (
    <div className={cn('grid grid-cols-3 gap-4', detailViewValueClass(variant))}>
      {details.map((detail) => (
        <div key={detail.label}>
          <div className={detailViewLabelClass(variant)}>{detail.label}</div>
          <div>{detail.value != null ? `${detail.value} ${detail.unit}` : '-'}</div>
        </div>
      ))}
    </div>
  );
}

export function RelatedEntities({ memodel, context, variant = ViewVariant.Light }: Props) {
  return (
    <div className={cn({ 'mt-5': variant !== ViewVariant.Default })}>
      <Tabs defaultMessage="No related entities found" variant={variant}>
        <Tab label="Simulations">
          <SimulationResults modelId={memodel.id} context={context} variant={variant} />
        </Tab>
        <Tab label="E-model">
          <EModelOverviewCard mode="summary" data={memodel.emodel} variant={variant} />
        </Tab>
        <Tab label="Morphology">
          <MorphologyOverviewCard mode="summary" data={memodel.morphology} variant={variant} />
        </Tab>
        <Tab label="Calibration result">
          <CalibrationResult memodel={memodel} variant={variant} />
        </Tab>
      </Tabs>
    </div>
  );
}
