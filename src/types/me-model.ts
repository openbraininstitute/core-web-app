import type { EModelMenuItem, MEModelMenuItem } from './e-model';
import { IdWithType, Type } from './explore-section/common';
import { Annotation } from './explore-section/delta-properties';
import { ESeModel } from './explore-section/es';
import { BrainLocation, Entity, ResourceMetadata } from '@/types/nexus';

export type { MEModelMenuItem };

/* -------------------------------- Features -------------------------------- */

export type MEFeatureKeys = 'somaDiameter' | 'yyy';

export type MEFeatureProps = {
  displayName: string;
  range: [number, number]; // min - max
  step: number;
  selectedRange: [number, number]; // min - max
};

export type MEFeatureWithEModel = {
  [key in MEFeatureKeys]: MEFeatureProps & {
    eModel: EModelMenuItem | null;
  };
};

/* --------------------------- DefaultPlaceholders -------------------------- */

export type DefaultPlaceholders = {
  hasPart: {
    [brainRegionId: string]: {
      about: 'BrainRegion';
      notation: string;
      label: string;
      hasPart: {
        [mTypeId: string]: {
          about: 'MType';
          label: string;
          hasPart: {
            [eTypeId: string]: {
              about: 'EType';
              label: string;
              hasPart: DefaultEModelPlaceholder;
            };
          };
        };
      };
    };
  };
};

export type DefaultEModelPlaceholder = {
  [eModelId: string]: {
    about: 'EModel';
    _rev: number;
  };
};

export type DefaultMEModelType = {
  mePairValue: [string, string];
  eModelValue: EModelMenuItem;
  brainRegionId: string;
};

/* ------------------------------ MEModel Build ----------------------------- */

type MEModelContribution = Type<'Contribution'> & {
  agent: IdWithType<string[]> & { name: string; givenName: string; familyName: string };
  hadRole: {
    '@id': string;
    label: string;
  };
};

export interface MEModel extends Entity {
  name: string;
  description: string;
  hasPart: [
    {
      '@type': 'EModel';
      '@id': string;
      name?: string;
    },
    {
      '@type': 'NeuronMorphology';
      '@id': string;
      name?: string;
    },
  ];
  contribution: MEModelContribution[];
  image?: ESeModel['image'];
  validated: boolean;
  status: 'initialized' | 'processing' | 'done' | 'running' | 'error';
  brainLocation?: BrainLocation; // it will be added later when the me-model analysis is run
  annotation?: Annotation[];
  eModel?: string;
  eType?: string;
  mType?: string;
  subject?: {
    '@type': 'Subject';
    species: {
      '@id': string;
      label: string;
    };
  };
}

export interface MEModelResource extends ResourceMetadata, MEModel {}

export type NexusMEModel = ResourceMetadata &
  MEModel & {
    eModel: string;
    eType: string;
    mType: string;
    threshold_current: number;
    holding_current: number;
    iteration: string;
    validated: boolean;
    image: ESeModel['image'];
  };
