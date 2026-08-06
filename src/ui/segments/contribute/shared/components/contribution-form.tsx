'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { motion } from 'framer-motion';
import { useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { StepNavigation } from '@/ui/segments/contribute/shared/components/step-navigation';
import { SubmitButton } from '@/ui/segments/contribute/shared/components/submit-button';
import { SubmitEntityProgress } from '@/ui/segments/contribute/shared/components/submit-progress';
import {
  ContributionPipelineProvider,
  useContributionPipeline,
} from '@/ui/segments/contribute/shared/pipeline/context';
import { cn } from '@/utils/css-class';

import type { ZodObject, ZodRawShape } from 'zod';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { WorkspaceContext } from '@/types/common';
import type {
  IContributionFormConfig,
  IProgressStep,
  TPipelineHookFactory,
} from '@/ui/segments/contribute/shared/types';

interface IContributionFormProps<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
> extends WorkspaceContext {
  config: IContributionFormConfig<TFormValues, TSchema>;
  sessionId: string;
  brainRegionId: string | null;
  pipeline: TPipelineHookFactory<TFormValues>;
  progressSteps: Array<{
    readonly key: string;
    readonly label: string;
    readonly mutationKey: string;
  }>;
  onCreateSuccess?: (entity: EntityCoreObjectTypes) => Promise<void>;
  onDone?: () => void;
}

interface IFormContentProps<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
> extends WorkspaceContext {
  config: IContributionFormConfig<TFormValues, TSchema>;
  sessionId: string;
  pipeline: TPipelineHookFactory<TFormValues>;
  progressSteps: Array<{ key: string; label: string; mutationKey: string }>;
  onCreateSuccess?: (entity: EntityCoreObjectTypes) => Promise<void>;
  onDone?: () => void;
}

function FormContent<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
>({
  config,
  sessionId,
  pipeline,
  progressSteps,
  virtualLabId,
  projectId,
  onCreateSuccess,
  onDone,
}: IFormContentProps<TFormValues, TSchema>) {
  const {
    form,
    activeStep,
    goToPreviousStep,
    goToNextStep,
    isFirstStep,
    isLastStep,
    progressSteps: steps,
  } = useContributionPipeline<TFormValues>();

  const { createEntity, loading, status } = pipeline({ sessionId });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEntityId, setCreatedEntityId] = useState<string | undefined>(undefined);

  const progressStepsWithStatus: Array<IProgressStep> = progressSteps.map((step) => ({
    key: step.key,
    label: step.label,
    status: status[step.mutationKey],
  }));

  const onSubmit = async (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e?.preventDefault();
    try {
      await form.validateFields();
      setIsSubmitting(true);
      const values = form.getFieldsValue(true) as TFormValues;
      const entity = await createEntity({ values });
      setCreatedEntityId(entity.id);
      await onCreateSuccess?.(entity);
    } catch (error) {
      console.error('On Create Success failed', error);
    }
  };

  const handleNext = async () => {
    const currentStepConfig = steps.find((step) => step.key === activeStep);
    const fieldKey = currentStepConfig?.schemaFieldKey;

    if (fieldKey) {
      try {
        const allFieldNames = form.getFieldsError().map((f) => f.name);
        const stepFieldNames = allFieldNames.filter(
          (name) => Array.isArray(name) && name[0] === fieldKey
        );

        const namesToValidate = stepFieldNames.length > 0 ? stepFieldNames : [[fieldKey]];

        await form.validateFields(namesToValidate);

        goToNextStep();
      } catch (errorInfo) {
        console.warn('Step validation failed:', errorInfo);
      }
    } else {
      goToNextStep();
    }
  };

  return (
    <Form form={form} layout="vertical" component={false} requiredMark={false} scrollToFirstError>
      <div className={cn('relative mx-auto h-full w-full px-6 py-2 flex flex-col')}>
        <Form.Item noStyle>
          <input type="hidden" />
        </Form.Item>
        <StepNavigation />

        <div className="border-neutral-2 h-full max-h-full min-h-0 flex-1 rounded-md border py-6 pr-1">
          {isSubmitting ? (
            <div className="flex h-full w-full items-center justify-center">
              <SubmitEntityProgress steps={progressStepsWithStatus} />
            </div>
          ) : (
            <div className="relative h-full w-full">
              {steps.map((step) => {
                const StepComponent = step.component;
                const isActive = activeStep === step.key;

                return (
                  <motion.div
                    key={step.key}
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      pointerEvents: isActive ? 'auto' : 'none',
                      display: isActive ? 'block' : 'none',
                    }}
                    className={cn(
                      'secondary-scrollbar h-full flex-1 overflow-auto rounded-xl pr-4 pl-4',
                      isActive ? 'relative' : 'absolute inset-0'
                    )}
                  >
                    <StepComponent />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-2 py-3 mt-auto">
          <Button
            rounded
            variant="outline"
            className="text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb size-12"
            size="lg"
            type="button"
            onClick={goToPreviousStep}
            disabled={isFirstStep || !!createdEntityId}
          >
            <LeftOutlined />
          </Button>

          <SubmitButton
            loading={loading}
            createdEntityId={createdEntityId}
            config={config}
            onSubmit={onSubmit}
            onDone={onDone}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />

          <Button
            rounded
            variant="outline"
            type="button"
            size="lg"
            className="text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb size-12"
            onClick={handleNext}
            disabled={isLastStep || !!createdEntityId}
          >
            <RightOutlined />
          </Button>
        </div>
      </div>
    </Form>
  );
}

export function ContributionForm<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
>(props: IContributionFormProps<TFormValues, TSchema>) {
  const {
    config,
    sessionId,
    brainRegionId,
    pipeline,
    progressSteps,
    virtualLabId,
    projectId,
    onDone,
    onCreateSuccess,
  } = props;

  return (
    <ContributionPipelineProvider
      config={config}
      sessionId={sessionId}
      brainRegionId={brainRegionId}
    >
      <FormContent
        config={config}
        sessionId={sessionId}
        pipeline={pipeline}
        progressSteps={progressSteps}
        virtualLabId={virtualLabId}
        projectId={projectId}
        onCreateSuccess={onCreateSuccess}
        onDone={onDone}
      />
    </ContributionPipelineProvider>
  );
}
