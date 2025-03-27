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

export type SingleCircuitListView = {
  key: string;
  name: string;
  description: string;
  brainRegion: string;
  specie: string;
  numberOfNeurons: string;
  numberOfConnections: string;
  numberOfSynapses: string;
  files: SingleFileProps[];
  provenance: {
    isASubcircuit: boolean;
    subcircuitOf: string | null;
    literature: PaperLitteratureProps[];
  };
  relatedPublications: PaperLitteratureProps[];
  hasSubcircuits: boolean;
  subcircuits: SingleCircuitListView[] | null;
  metadata: {
    contributors?: string[];
    contributorIndividual?: string;
    contributingInstitution?: string;
    revision: number;
    createdBy: string;
    creationDate: string;
    license: {
      name: string;
      url: string;
    } | null;
  };
  images: {
    low?: string;
    normal?: string;
    high: string;
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
  render?: (value: SingleCircuitListView) => ReactNode;
  width?: number;
};

export type InteractiveImageProps = {
  circuit: string;
  src: string;
  alt: string;
  width: number;
  height: number;
};
