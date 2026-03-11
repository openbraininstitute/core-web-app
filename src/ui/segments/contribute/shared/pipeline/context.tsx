'use client';

import { Form } from 'antd';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  getCurrentStepIndex,
  getDirtyFields,
  getValidationStatus,
} from '@/ui/segments/contribute/shared/helpers';
import { cn } from '@/utils/css-class';

import type { FormInstance } from 'antd';
import type { ReactNode } from 'react';
import type { ZodObject, ZodRawShape } from 'zod';
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
  notifyChange: () => void;
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
  const [formSnapshot, setFormSnapshot] = useState<Record<string, unknown>>({});
  const [extraDirtyFields, setExtraDirtyFields] = useState<Array<string>>([]);
  const [activeStep, setActiveStepState] = useState<string>(config.progressSteps[0].key);

  const { progressSteps, schema } = config;

  const stepValidationStatus = useMemo(() => {
    const allValues = formSnapshot;
    const dirtyFields = [...new Set([...getDirtyFields(form), ...extraDirtyFields])];
    const statusMap: Record<string, TStepValidationStatus> = {};

    progressSteps.forEach((step) => {
      const fieldKey = step.schemaFieldKey;

      if (Array.isArray(fieldKey)) {
        const pickObject = fieldKey.reduce(
          (acc, key) => {
            acc[key] = true;
            return acc;
          },
          {} as Record<string, true>
        );

        const partialSchema = schema.pick(pickObject);
        const parseResult = partialSchema.safeParse(allValues);

        const isDirty = fieldKey.some((key) => dirtyFields.includes(key));
        const hasErrors = !parseResult.success;

        if (!isDirty) {
          statusMap[step.key] = 'non-touched';
        } else if (hasErrors) {
          statusMap[step.key] = 'invalid';
        } else {
          statusMap[step.key] = 'valid';
        }
      } else {
        const partialSchema = schema.pick({ [fieldKey]: true } as Record<string, true>);
        const parseResult = partialSchema.safeParse(allValues);
        statusMap[step.key] = getValidationStatus(parseResult, fieldKey as string, dirtyFields);
      }
    });

    return statusMap;
  }, [progressSteps, schema, formSnapshot, form, extraDirtyFields]);

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

  const notifyChange = useCallback(() => {
    const raw = form.getFieldsValue(true) as Record<string, unknown>;
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (v instanceof File) continue;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const nested: Record<string, unknown> = {};
        for (const [nk, nv] of Object.entries(v as Record<string, unknown>)) {
          if (!(nv instanceof File)) nested[nk] = nv;
        }
        safe[k] = nested;
      } else {
        safe[k] = v;
      }
    }
    setFormSnapshot(safe);
    setExtraDirtyFields(Object.keys(safe).filter((k) => {
      const v = safe[k];
      if (v === null || v === undefined) return false;
      if (typeof v === 'object' && !Array.isArray(v)) {
        return Object.values(v as Record<string, unknown>).some((nv) => nv !== undefined && nv !== null && nv !== '');
      }
      return true;
    }));
  }, [form]);

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
      notifyChange,
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
      notifyChange,
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
        onValuesChange={notifyChange}
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
