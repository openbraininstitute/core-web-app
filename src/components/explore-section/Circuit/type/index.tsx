import { ReactNode } from 'react';

export type PaperLiteratureProps = {
  title: string;
  type: string;
  authors: string[];
  link: string;
  doi: string;
  publicationDate: string;
  abstract: string;
  category: string;
};

export type SingleFileProps = {
  type: string;
  url: string;
  key: string;
  isAvailable: boolean;
};

export type GraphDataImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type CircuitSchemaProps = {
  key: string;
  name: string;
  description: string;
  parent?: string | null;
  derivedFrom: string[];
  hasSubcircuits: boolean;
  brainRegion: string;
  species: string;
  numberOfNeurons: number;
  numberOfConnections: number;
  numberOfSynapses: number;
  scale: string;
  buildCategory: string;
  metadata: {
    contributorSimple?: string;
    contributors?: ContributorsProps[];
    organizations: string[];
    contributingInstitution?: string;
    publishedIn?: string;
    registrationDate?: string;
    revision: number | null;
    createdBy: string | null;
    creationDate: string;
    license: {
      name: string;
      url: string;
    } | null;
    contact: string | null;
  };
  files: DownloadItemProps[];
  subcircuits: CircuitSchemaProps[];

  overview: {
    mainDisplay: {
      name: string;
      url: string;
    }[];
    cellStatistics: {
      name: string;
      url: string;
    }[];
    networkStatistics: {
      name: string;
      url: string;
    }[];
  };

  literature: PaperLiteratureProps[];
};

export type FullCircuitData = {
  content: CircuitSchemaProps;
  parent: CircuitSchemaProps | null;
  derivedFrom: CircuitSchemaProps[] | null;
};

export type CircuitCellValue = {
  name: string;
  description: 'string';
  brainRegion: string;
  createdBy: string;
  creationDate: string;
  hasSubcircuits: boolean;
};

export type CircuitColumn = {
  title: string;
  key?: string;
  render?: (value: CircuitSchemaProps) => ReactNode;
  width?: number;
  fixed?: 'left';
};

export type InteractiveImageProps = {
  circuit: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type NumericFilterProperty =
  | 'numberOfNeurons'
  | 'numberOfConnections'
  | 'numberOfSynapses'
  | 'scaleType';

export type NumericFilterType =
  | 'greaterThan'
  | 'lessThan'
  | 'between'
  | 'smallMicrocircuit'
  | 'microcircuit';

export type FilterOptionsProps = {
  searchQuery?: string;
  numericFilter?: NumericFilterOptions | null;
};

export type NumericFilterOptions = {
  property:
    | 'numberOfNeurons'
    | 'numberOfConnections'
    | 'numberOfSynapses'
    | 'scaleType'
    | 'buildCategory';
  type: string;
  min?: number;
  max?: number;
};

export type DownloadItemProps = {
  fileType: string;
  children?: SingleSelectedDownloadableItemProps[];
};

export type SingleSelectedDownloadableItemProps = {
  fileType: string;
  extension: string;
  name: string;
  url: string;
  description: string;
  size: number;
};

export type FileTypeHeaderProps = {
  name: string;
  description: React.ReactNode;
  extension: string;
};

export interface FilteredCircuit extends CircuitSchemaProps {
  isNonMatchingParent?: boolean;
}

export type CollaboratingInstitution = {
  name: string;
  url: string;
  location: string;
};

export type ContributorsProps = {
  name: string;
  lastName: string;
};

export type NumericFilterProps = {
  filter: NumericFilterOptions | null;
  minValue: number | undefined;
  maxValue: number | undefined;
  onFilterChange: (filter: NumericFilterOptions | null) => void;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
};

export type CellTypeProps = {
  id: string;
  pref_label: string;
  alt_label: string | '';
  definition: string;
  creation_date: string;
  update_date: string;
};
