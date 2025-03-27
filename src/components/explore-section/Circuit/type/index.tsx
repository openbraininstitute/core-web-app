import { ReactNode } from 'react';

export type PaperLitteratureProps = {
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
  parent?: string;
  hasSubcircuits: boolean;
  brainRegion: string;
  species: string;
  numberOfNeurons: number | string;
  numberOfConnections: number;
  numberOfSynapses: number;
  metadata: {
    contributorSimple?: string;
    contributor?: string;
    contributingInstitution?: string;
    registrationDate?: string;
    revision: number | null;
    createdBy: string;
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
  subcircuits: CircuitSchemaProps[] | null;

  // TO BE REVISED
  provenance: {
    isASubcircuit: boolean;
    subcircuitOf: string | null;
    literature: PaperLitteratureProps[];
  };
  relatedPublications: PaperLitteratureProps[];
  images: {
    low?: string | null;
    normal?: string | null;
    high: string | null;
  };
  overview: {
    cellStatistics: GraphDataImageProps[];
    networkStatistics: GraphDataImageProps[];
  };
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
