'use client';

import { useMemo } from 'react';

import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { createCellMorphologyImportAdapter, EntityImportFeature } from '@/features/entity-import';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  CELL_MORPHOLOGY_PROGRESS_STEPS,
  createCellMorphologyConfig,
} from '@/ui/segments/contribute/cell-morphology/config';
import { useCellMorphologyPipeline } from '@/ui/segments/contribute/cell-morphology/pipeline';
import {
  AssetUpload,
  Contribution,
  License,
  MTypeClassification,
  Protocol,
  Setup,
  Subject,
} from '@/ui/segments/contribute/cell-morphology/steps';
import {
  ContributionForm,
  type TSingleContributionPageShell,
} from '@/ui/segments/contribute/shared/components/contribution-form';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';

import type { TCellMorphologyForm } from '@/ui/segments/contribute/cell-morphology/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

interface ICellMorphologyProps {
  sessionId: string;
  pageShell: TSingleContributionPageShell;
}

const CELL_MORPHOLOGY_STEP_CONFIG: Array<IContributionStep<TCellMorphologyForm>> = [
  {
    key: 'assets',
    label: 'Asset Upload',
    schemaFieldKey: 'assets',
    component: AssetUpload,
  },
  {
    key: 'setup',
    label: 'Setup',
    schemaFieldKey: 'setup',
    component: Setup,
  },
  {
    key: 'protocol',
    label: 'Protocol',
    schemaFieldKey: 'cell_morphology_protocol_id',
    component: Protocol,
  },
  {
    key: 'contribution',
    label: 'Contribution',
    schemaFieldKey: 'contribution',
    component: Contribution,
  },
  {
    key: 'subject',
    label: 'Subject',
    schemaFieldKey: 'subject_id',
    component: Subject,
  },
  {
    key: 'license',
    label: 'License',
    schemaFieldKey: 'license_id',
    component: License,
    hasTooltip: true,
  },
  {
    key: 'mtype',
    label: 'M-Type',
    schemaFieldKey: 'mtype_class_id',
    component: MTypeClassification,
  },
];

const cellMorphologyConfig = createCellMorphologyConfig(CELL_MORPHOLOGY_STEP_CONFIG);

export function CellMorphology({ sessionId, pageShell }: ICellMorphologyProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return (
    <ContributionForm
      config={cellMorphologyConfig}
      brainRegionId={defaultBrainRegion.id}
      pipeline={useCellMorphologyPipeline}
      progressSteps={CELL_MORPHOLOGY_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
      sessionId={sessionId}
      pageShell={pageShell}
    />
  );
}

type ICellMorphologyImportProps = {
  title: string | null;
};

export function CellMorphologyImport({ title }: ICellMorphologyImportProps) {
  const { projectId, virtualLabId } = useWorkspace();
  const adapter = useMemo(() => createCellMorphologyImportAdapter({}), []);

  return (
    <EntityImportFeature
      title={title}
      onClose={() => {}}
      adapter={adapter}
      context={{
        projectId,
        virtualLabId,
      }}
    />
  );
}
