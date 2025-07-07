import { Dispatch, SetStateAction, type JSX } from 'react';
import { Loadable } from 'jotai/vanilla/utils/loadable';
import { FlattenedExploreESResponse, ExploreResource } from '@/types/explore-section/es';
import { ExperimentTypeNames } from '@/constants/explore-section/data-types/experiment-data-types';
import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';
import { Filter, GteLteValue } from '@/features/listing-filter-panel/types';
import { DataType } from '@/constants/explore-section/list-views';
import { Prettify } from '@/utils/type';

export type { DetailProps } from './types';

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

type ListViewAtomValues = {
  activeColumns: string[];
  aggregations: Loadable<FlattenedExploreESResponse<ExploreResource>['aggs']>;
  data: Loadable<ExploreResource[] | undefined>;
  filters: Filter[];
  pageSize: number;
  searchString: string;
  sortState: SortState;
  total: Loadable<FlattenedExploreESResponse<ExploreResource>['total'] | undefined>;
};

type ListViewAtoms<T> = {
  [P in keyof T]: [T[P], Dispatch<SetStateAction<T[P]>>];
};

export type FilterValues = {
  [field: string]: string | number | string[] | GteLteValue | null;
};

type CheckListProps = {
  options: {
    checked: boolean;
    count: number | null;
    id: string;
    label: string;
  }[];
  renderLength: number;
  handleCheckedChange: (value: string) => void;
  filterField: Filter['field'];
  search: () => JSX.Element;
  loadMoreBtn: () => JSX.Element | null | false;
  defaultRenderLength: number; // Added defaultRenderLength as a prop
};

type SubSectionCardItem = {
  name: string;
  type: DataType;
  url: string;
};

type SingleCard = {
  prefixIcon?: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  image: string;
  items?: SubSectionCardItem[] | null;
};

export type ResourceInfo = {
  id: string;
  project: string;
  org: string;
  rev?: number;
};

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
