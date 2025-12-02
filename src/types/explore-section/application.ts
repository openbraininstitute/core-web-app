import { ExperimentTypeNames } from '@/entity-configuration/domain/experimental';
import { ModelTypeNames } from '@/entity-configuration/domain/model';
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

export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
export type TSortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export interface SortState {
  field: string;
  backendField: string;
  order: TSortOrder | null;
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
