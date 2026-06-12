'use client';

import { EmDatasetPrerequisiteCards } from '@/ui/segments/workflows/browse/prerequisite/em-dataset-cards';
import { MICRONS_PORTION_65_DATASET_IDS } from '@/ui/segments/workflows/browse/prerequisite/em-dataset-cards.constants';

import type { TBrowsePrerequisitePickerProps } from '@/ui/segments/workflows/browse/browse-config';

export function EmSynapseMappingDatasetPrerequisiteCards(props: TBrowsePrerequisitePickerProps) {
  return <EmDatasetPrerequisiteCards {...props} idIn={MICRONS_PORTION_65_DATASET_IDS} />;
}
