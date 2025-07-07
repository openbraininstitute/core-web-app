import { ResourceInfo } from '@/types/explore-section/application';

export type RulesOutput = {
  resource_id: string;
  rules: {
    id: string;
    name: string;
    description: string;
    resourceType: string;
    inputParameters: InputParameter[];
    nexusLink: string;
    embeddingModels: Record<string, EmbeddingModel>;
  }[];
}[];

type EmbeddingModel = {
  description: string;
  name: string;
  distance: string;
  id: string;
};

interface InputFilter {
  TargetResourceParameter: string;
  SelectModelsParameter: string[];
  LimitQueryParameter?: number;
}

interface PayLoadValues {
  [key: string]: string;
}
interface Payload {
  name: string;
  description: string;
  optional: boolean;
  default: any[] | null;
  type: string;
  values: PayLoadValues;
}

interface InferenceOptionsState {
  [key: string]: boolean;
}
interface RuleWithOptionsProps {
  [rule: string]: InferenceOptionsState;
}

interface InputParameter {
  name: string;
  payload: Payload;
  values?: ResourceBasedGeneralization[];
}

export interface ResourceBasedInference {
  displayName: string;
  name: string;
  id: string;
  value: boolean;
  description: string;
  score?: number;
}
export interface ResourceBasedGeneralization {
  org: string;
  project: string;
  name: string;
  type: string;
  id: string;
  description: string;
  about: string;
  hasPart: any[];
  distance: string;
  checked?: boolean;
}

export type InferenceError = {
  detail: {
    loc: Array<number | string>;
    msg: string;
    type: string;
  }[];
};

export interface ResourceBasedInferenceRequest {
  rules: { id: string }[];
  inputFilter: InputFilter;
}

type ResourceBasedInferenceSingleResponse = {
  id: string;
  results: ResourceBasedInference[];
};

export type ResourceBasedInferenceResponse = Array<ResourceBasedInferenceSingleResponse>;

export type InferredResource = Omit<
  ResourceBasedInference,
  'value' | 'description' | 'displayName'
> & { resourceInfo?: ResourceInfo };
