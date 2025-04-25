export type ZoomRanges = Record<'x' | 'y', Array<number | undefined>>;

export type AxesState = {
  xAxis?: string;
  yAxis?: string;
};

export enum SynapticPosition {
  Pre,
  Post,
}

export enum SynapticType {
  BrainRegion = 'https://neuroshapes.org/BrainRegion',
  CellType = 'https://bbp.epfl.ch/ontologies/core/bmo/BrainCellType',
}

export type SynapticPathway = {
  '@id': string;
  about: string;
  label: string;
  idLabel?: string;
  identifier?: string;
};

// TODO: Move this to "es-common"?
export type IdLabel<
  T = {
    [key: string]: string;
  },
> = T & {
  id?: string;
  label?: string;
};
