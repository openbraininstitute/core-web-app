import { ReactNode } from 'react';

export type PaperLitteratureProps = {
  category: string;
  title: string;
  authors: string;
  url: string;
  journal: string;
  publicationDate: string;
  abstract: string;
  doi: string;
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
  metadata: {
    contributorSimple?: string;
    contributor?: string | null;
    contributingInstitution?: string;
    registrationDate?: string;
    revision: number | null;
    createdBy: string | null;
    creationDate: string;
    license: {
      name: string;
      url: string;
    } | null;
  };
  files: {
    kind: string;
    url: string;
    key: string;
    isAvailable: boolean;
  }[];
  subcircuit: CircuitSchemaProps[] | [];

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

  literature: {
    category: string;
    title: string;
    authors: string;
    doi: string;
    url: string;
    journal: string;
    publicationDate: string;
    abstract: string;
  }[];
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

export type SingleGraphDataProps = {
  label: string;
  value: number;
};

export type GraphDataProps = {
  name: string;
  type: string;
  data: SingleGraphDataProps[];
};
