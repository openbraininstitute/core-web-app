'use client';

import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { Form } from 'antd';

import type { ZodObject, ZodRawShape } from 'zod';
import type { FormInstance } from 'antd';
import type { ReactNode } from 'react';

import {
  getDirtyFields,
  getValidationStatus,
  getCurrentStepIndex,
} from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

import type {
  IContributionFormConfig,
  IContributionStep,
  TStepValidationStatus,
} from '@/ui/segments/contribute/shared/types';

interface IContributionPipelineContextValue<TFormValues extends Record<string, unknown>> {
  form: FormInstance<TFormValues>;
  activeStep: string;
  setActiveStep: (stepKey: string) => void;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  sessionId: string;
  stepValidationStatus: Record<string, TStepValidationStatus>;
  progressSteps: Array<IContributionStep<TFormValues>>;
  config: IContributionFormConfig<TFormValues, ZodObject<ZodRawShape>>;
}

const ContributionPipelineContext = createContext<IContributionPipelineContextValue<
  Record<string, unknown>
> | null>(null);

interface IContributionPipelineProviderProps<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
> {
  config: IContributionFormConfig<TFormValues, TSchema>;
  sessionId: string;
  brainRegionId: string;
  children: ReactNode;
}

export function ContributionPipelineProvider<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
>({
  config,
  sessionId,
  brainRegionId,
  children,
}: IContributionPipelineProviderProps<TFormValues, TSchema>): ReactNode {
  const [form] = Form.useForm<TFormValues>();
  const allValues = Form.useWatch([], form);
  const [activeStep, setActiveStepState] = useState<string>(config.progressSteps[0].key);

  const { progressSteps, schema } = config;

  const stepValidationStatus = useMemo(() => {
    const dirtyFields = getDirtyFields(form);
    const statusMap: Record<string, TStepValidationStatus> = {};

    progressSteps.forEach((step) => {
      const fieldKey = step.schemaFieldKey as string;
      const partialSchema = schema.pick({ [fieldKey]: true } as Record<string, true>);
      const parseResult = partialSchema.safeParse(allValues);
      statusMap[step.key] = getValidationStatus(parseResult, fieldKey, dirtyFields);
    });

    return statusMap;
  }, [progressSteps, schema, allValues, form]);

  const currentStepIndex = useMemo(
    () => getCurrentStepIndex(progressSteps, activeStep),
    [progressSteps, activeStep]
  );

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === progressSteps.length - 1;

  const setActiveStep = useCallback(
    (stepKey: string) => {
      if (stepKey !== activeStep) {
        setActiveStepState(stepKey);
      }
    },
    [activeStep]
  );

  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setActiveStepState(progressSteps[currentStepIndex - 1].key);
    }
  }, [currentStepIndex, progressSteps]);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < progressSteps.length - 1) {
      setActiveStepState(progressSteps[currentStepIndex + 1].key);
    }
  }, [currentStepIndex, progressSteps]);

  const contextValue = useMemo(
    (): IContributionPipelineContextValue<TFormValues> => ({
      form,
      activeStep,
      setActiveStep,
      goToPreviousStep,
      goToNextStep,
      isFirstStep,
      isLastStep,
      sessionId,
      stepValidationStatus,
      progressSteps,
      config: config as IContributionFormConfig<TFormValues, ZodObject<ZodRawShape>>,
    }),
    [
      form,
      activeStep,
      setActiveStep,
      goToPreviousStep,
      goToNextStep,
      isFirstStep,
      isLastStep,
      sessionId,
      stepValidationStatus,
      progressSteps,
      config,
    ]
  );
  const initialValues = useMemo(
    () => config.getInitialValues(brainRegionId) as TFormValues,
    [config, brainRegionId]
  );

  return (
    <ContributionPipelineContext.Provider
      value={contextValue as IContributionPipelineContextValue<Record<string, unknown>>}
    >
      <Form
        form={form}
        id={config.formId}
        rootClassName={cn(
          'relative flex flex-col w-full h-full [&_.ant-form-item-explain-error]:text-sm! ',
          '[&_.ant-form-item-explain-error]:pl-1.5! [&_.ant-form-item-explain-error]:select-none!'
        )}
        layout="vertical"
        requiredMark={false}
        className="h-full"
        validateTrigger={['onChange', 'onBlur']}
        autoComplete="off"
        initialValues={initialValues}
      >
        {children}
      </Form>
    </ContributionPipelineContext.Provider>
  );
}

export function useContributionPipeline<
  TFormValues extends Record<string, unknown> = Record<string, unknown>,
>(): IContributionPipelineContextValue<TFormValues> {
  const context = useContext(ContributionPipelineContext);

  if (!context) {
    throw new Error('useContributionPipeline must be used within a ContributionPipelineProvider');
  }

  return context as IContributionPipelineContextValue<TFormValues>;
}
