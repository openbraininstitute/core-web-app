import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TElectricalCellRecordingForm } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { ElectricalCellRecordingSchema } from '@/ui/segments/contribute/electrical-cell-recording/schema';
import { DEFAULT_LICENSE_ID } from '@/ui/segments/contribute/shared/schemas';
import type {
  IContributionFormConfig,
  IContributionStep,
} from '@/ui/segments/contribute/shared/types';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export const ELECTRICAL_CELL_RECORDING_PROGRESS_STEPS: Array<{
  key: string;
  label: string;
  mutationKey: string;
}> = [
  {
    key: 'electrical-cell-recording',
    label: 'Creating Cell Recording',
    mutationKey: 'createElectricalCellRecording',
  },
  {
    key: 'contribution',
    label: 'Creating Contribution',
    mutationKey: 'createContribution',
  },
  {
    key: 'etype-classification',
    label: 'Creating E-Type Classification',
    mutationKey: 'createEtypeClassification',
  },
  {
    key: 'assets',
    label: 'Uploading Assets',
    mutationKey: 'createElectricalCellRecordingAssets',
  },
];

export function createElectricalCellRecordingConfig(
  steps: IContributionStep<TElectricalCellRecordingForm>[],
): IContributionFormConfig<TElectricalCellRecordingForm, typeof ElectricalCellRecordingSchema> {
  return {
    entityType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
    title: 'Electrical Cell Recording',
    formId: 'contribute-electrical-cell-recording-modal',
    schema: ElectricalCellRecordingSchema,
    progressSteps: steps,
    getInitialValues: (brainRegionId: string) => ({
      setup: {
        brain_region_id: brainRegionId,
        recording_origin: 'in_vitro',
      } as TElectricalCellRecordingForm['setup'],
      contribution: [{}] as TElectricalCellRecordingForm['contribution'],
      license_id: DEFAULT_LICENSE_ID,
    }),
    buildDetailsUrl: ({ entityId, virtualLabId, projectId }) =>
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        entityId,
        dataType: ExtendedEntitiesTypeDict.ElectricalCellRecording,
      }),
  };
}
