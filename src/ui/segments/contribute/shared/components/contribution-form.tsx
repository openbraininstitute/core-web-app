'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { motion } from 'framer-motion';
import { useState } from 'react';

import type { ZodObject, ZodRawShape } from 'zod';
import type { WorkspaceContext } from '@/types/common';
import { Button } from '@/ui/molecules/button';
import { StepNavigation } from '@/ui/segments/contribute/shared/components/step-navigation';
import { SubmitButton } from '@/ui/segments/contribute/shared/components/submit-button';
import { SubmitEntityProgress } from '@/ui/segments/contribute/shared/components/submit-progress';
import {
  ContributionPipelineProvider,
  useContributionPipeline,
} from '@/ui/segments/contribute/shared/pipeline/context';
import type {
  IContributionFormConfig,
  IProgressStep,
  TPipelineHookFactory,
} from '@/ui/segments/contribute/shared/types';
import { cn } from '@/utils/css-class';

interface IContributionFormProps<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
> extends WorkspaceContext {
  config: IContributionFormConfig<TFormValues, TSchema>;
  sessionId: string;
  brainRegionId: string;
  pipeline: TPipelineHookFactory<TFormValues>;
  progressSteps: Array<{
    readonly key: string;
    readonly label: string;
    readonly mutationKey: string;
  }>;
}

interface IFormContentProps<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
> extends WorkspaceContext {
  config: IContributionFormConfig<TFormValues, TSchema>;
  sessionId: string;
  pipeline: TPipelineHookFactory<TFormValues>;
  progressSteps: Array<{ key: string; label: string; mutationKey: string }>;
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

  const progressStepsWithStatus: IProgressStep[] = progressSteps.map((step) => ({
    key: step.key,
    label: step.label,
    status: status[step.mutationKey],
  }));

  const onSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const values = form.getFieldsValue(true) as TFormValues;
    const id = await createEntity({ values });
    setCreatedEntityId(id);
  };

  return (
    <div className={cn('relative mx-auto h-full w-full px-6 py-2')}>
      <Form.Item noStyle>
        <input type="hidden" />
      </Form.Item>
      <StepNavigation />

      <div className="border-neutral-2 h-full max-h-[calc(100%-11rem)] min-h-0 flex-1 rounded-md border py-6 pr-1">
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
                  id={`contribution-step-${step.key}`}
                  aria-labelledby={step.key}
                  aria-describedby={step.key}
                  aria-hidden={!isActive}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    pointerEvents: isActive ? 'auto' : 'none',
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

      <div className="flex w-full flex-shrink-0 items-center justify-between gap-2 py-3">
        <Button
          rounded
          variant="outline"
          className={cn(
            'text-primary-9 border-primary-9 disabled:border-neutral-1',
            'shadow-bnb size-12 active:text-white'
          )}
          size="lg"
          type="button"
          onClick={goToPreviousStep}
          disabled={isFirstStep}
        >
          <LeftOutlined />
        </Button>
        <SubmitButton
          loading={loading}
          createdEntityId={createdEntityId}
          config={config}
          onSubmit={onSubmit}
          virtualLabId={virtualLabId}
          projectId={projectId}
        />
        <Button
          rounded
          variant="outline"
          type="button"
          size="lg"
          className={cn(
            'text-primary-9 border-primary-9 disabled:border-neutral-1',
            'shadow-bnb size-12 active:text-white'
          )}
          onClick={goToNextStep}
          disabled={isLastStep}
        >
          <RightOutlined />
        </Button>
      </div>
    </div>
  );
}

export function ContributionForm<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
>(props: IContributionFormProps<TFormValues, TSchema>) {
  const { config, sessionId, brainRegionId, pipeline, progressSteps, virtualLabId, projectId } =
    props;

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
      />
    </ContributionPipelineProvider>
  );
}
