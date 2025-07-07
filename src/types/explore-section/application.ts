import { ExperimentTypeNames } from '@/constants/explore-section/data-types/experiment-data-types';
import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';
import { Prettify } from '@/utils/type';

// defines the source from where the explore data will be retrieved
// SelectedBrainRegion: The data will be filtered based on the selected brain region
// BookmarkedResources: The data will be retrieved by the bookmarked resources
// NoScope: No scope is applied as a result all available resources will be returned
export enum ExploreDataScope {
  NoScope = 'NoScope',
  SelectedBrainRegion = 'SelectedBrainRegion',
  BuildSelectedBrainRegion = 'BuildSelectedBrainRegion',
  BookmarkedResources = 'BookmarkedResources',
}

export interface SortState {
  field: string;
  order: 'asc' | 'desc';
}
interface EntityCoreSortState {
  property: string;
  value: string;
  direction: '+' | '-';
}

export type DetailViewUrlParams = Prettify<
  {
    id: string;
    virtualLabId?: string;
    projectId?: string;
  } & (
    | {
        experimentType?: ExperimentTypeNames;
      }
    | {
        modelType?: ModelTypeNames;
      }
  )
>;
