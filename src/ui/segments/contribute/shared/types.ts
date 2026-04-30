import type { MutationStatus } from '@tanstack/react-query';
import type { FormInstance } from 'antd';
import type { ComponentType, ReactNode } from 'react';
import type { ZodObject, ZodRawShape, z } from 'zod';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type TStepValidationStatus = 'valid' | 'invalid' | 'non-touched';

export type TStepIconRenderer = (status: TStepValidationStatus) => ReactNode;

export interface IContributionStep<TFormValues> {
  key: string;
  label: string;
  schemaFieldKey: keyof TFormValues;
  component: ComponentType;
  iconRenderer?: TStepIconRenderer;
  hasTooltip?: boolean;
  tooltipContent?: ReactNode;
}

export interface IContributionFormConfig<TFormValues, TSchema extends ZodObject<ZodRawShape>> {
  entityType: TExtendedEntitiesTypeDict;
  title: string;
  formId: string;
  schema: TSchema;
  progressSteps: Array<IContributionStep<TFormValues>>;
  getInitialValues: (brainRegionId: string) => Partial<TFormValues>;
  buildDetailsUrl: (params: {
    entityId: string;
    virtualLabId: string;
    projectId: string;
  }) => string | '__NO_DETAILS_URL__';
}

export interface IMutationKeyConfig {
  key: Array<string>;
  label: string;
}

export interface IPipelineHookResult<TFormValues> {
  createEntity: (params: { values: TFormValues }) => Promise<EntityCoreObjectTypes>;
  loading: boolean;
  error: Error | null;
  status: Record<string, MutationStatus>;
  mutationKeys: Record<string, IMutationKeyConfig>;
}

export type TPipelineHookFactory<TFormValues> = (params: {
  sessionId: string;
}) => IPipelineHookResult<TFormValues>;

export interface IContributionFormContext<TFormValues extends Record<string, unknown>> {
  form: FormInstance<TFormValues>;
  activeStep: string;
  setActiveStep: (stepKey: string) => void;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  sessionId: string;
  stepValidationStatus: Record<string, TStepValidationStatus>;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
}

export const AgentType = {
  Person: {
    key: 'person',
    label: 'Person',
  },
  Organization: {
    key: 'organization',
    label: 'Organization',
  },
  Consortium: {
    key: 'consortium',
    label: 'Consortium',
  },
} as const;

export type TAgentType = (typeof AgentType)[keyof typeof AgentType]['key'];

export interface IBaseContribution {
  agent_type?: TAgentType;
  agent_id?: string;
  role_id?: string;
}

export interface IBaseSetup {
  name: string;
  description: string;
  brain_region_id: string;
  experiment_date?: unknown;
  contact_email?: string | null;
  published_in?: string | null;
  location?: {
    x?: number | null;
    y?: number | null;
    z?: number | null;
  } | null;
}

export interface IBaseFormValues {
  setup: IBaseSetup;
  subject_id: string;
  license_id: string;
  contribution: Array<IBaseContribution>;
  assets: Record<string, File>;
}

export interface IProgressStep {
  key: string;
  label: string;
  status?: MutationStatus;
}

export interface ICustomFormErrorOptions {
  cause?: unknown;
  field?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export function isValidStepStatus(status: unknown): status is TStepValidationStatus {
  return status === 'valid' || status === 'invalid' || status === 'non-touched';
}

export type ExtractFormValues<T> =
  T extends IContributionFormConfig<infer V, ZodObject<ZodRawShape>> ? V : never;

export type ExtractSchema<T> =
  T extends IContributionFormConfig<Record<string, unknown>, infer S> ? S : never;

export type InferFormValues<T extends ZodObject<ZodRawShape>> = z.infer<T>;
