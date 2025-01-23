import { Field } from '@/constants/explore-section/fields-config/enums';
import { SelectedBrainRegion } from '@/state/brain-regions/types';
import { DetailProps } from '@/types/explore-section/application';

export type DataTypeConfig = {
  title: string;
  name: string;
  columns: Array<Field>;
  curated: boolean;
  group: DataTypeGroup;
  cardViewFields?: DetailProps[];
  mlTopic?: string;
  // Overwrite the default queries
  custom?: Partial<{
    totalByExperimentAndRegionsAtom(
      selectedBrainRegion: SelectedBrainRegion
    ): Promise<number | undefined | null>;
  }>;
};

export enum DataTypeGroup {
  ExperimentalData = 'ExperimentalData',
  ModelData = 'ModelData',
  SimulationData = 'SimulationData',
}
