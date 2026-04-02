'use client';

import { CloseOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

import {
  ImportLeftSideTab,
  ImportMode,
  UploadFlowSidebar,
} from '@/ui/segments/contribute/flow-elements';
import { VerticalStepNavigation } from '@/ui/segments/contribute/shared/components/step-navigation';
import { SubmitButton } from '@/ui/segments/contribute/shared/components/submit-button';
import { SubmitEntityProgress } from '@/ui/segments/contribute/shared/components/submit-progress';
import {
  ContributionPipelineProvider,
  useContributionPipeline,
} from '@/ui/segments/contribute/shared/pipeline/context';
import { cn } from '@/utils/css-class';

import type { ZodObject, ZodRawShape } from 'zod';
import type { WorkspaceContext } from '@/types/common';
import type {
  IContributionFormConfig,
  IProgressStep,
  TPipelineHookFactory,
} from '@/ui/segments/contribute/shared/types';

export type TSingleContributionPageShell = {
  /** Contribute page URL (Type step). */
  typeHref: string;
  /** Contribute page URL with Options step (see contribute page `view` query). */
  optionsHref: string;
  /** Contribute page URL for header close (typically same as type or options). */
  backHref: string;
  entityTitle: string;
  /** Main panel title; defaults to “Upload new {entityTitle} files”. */
  formHeading?: string;
};

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
  pageShell: TSingleContributionPageShell;
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
  const { form, activeStep, progressSteps: steps } = useContributionPipeline<TFormValues>();

  const { createEntity, loading, status } = pipeline({ sessionId });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdEntityId, setCreatedEntityId] = useState<string | undefined>(undefined);

  const progressStepsWithStatus: Array<IProgressStep> = progressSteps.map((step) => ({
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
    <div className="relative mx-auto flex min-h-0 w-full flex-1 flex-col py-0">
      <Form.Item noStyle>
        <input type="hidden" />
      </Form.Item>

      <div className="h-full max-h-full min-h-0 flex-1 bg-background py-6 pr-1 shadow-none">
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
                    'secondary-scrollbar h-full flex-1 overflow-auto rounded-xl px-2',
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

      <div className="mt-auto flex w-full shrink-0 items-center justify-end gap-2 py-3">
        <SubmitButton
          loading={loading}
          createdEntityId={createdEntityId}
          config={config}
          onSubmit={onSubmit}
          virtualLabId={virtualLabId}
          projectId={projectId}
        />
      </div>
    </div>
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
    pageShell,
  } = props;

  const formHeading =
    pageShell.formHeading ?? `Upload new ${pageShell.entityTitle.toLowerCase()} files`;

  return (
    <ContributionPipelineProvider
      config={config}
      sessionId={sessionId}
      brainRegionId={brainRegionId}
    >
      <div className="grid h-full min-h-0 w-full grid-cols-[25rem_auto] gap-3">
        <div className="min-h-0 min-w-0 overflow-y-auto">
          <UploadFlowSidebar
            hasTypeSelected
            suppressUploadTabActiveStyle
            bottomSlot={<VerticalStepNavigation />}
            currentTab={ImportLeftSideTab.Type}
            mode={ImportMode.Single}
            optionsHref={pageShell.optionsHref}
            optionsValueLabel="Single"
            typeHref={pageShell.typeHref}
            typeValueLabel={pageShell.entityTitle}
          />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-2 pl-3">
            <h3 className="text-primary-9 text-2xl font-bold">{formHeading}</h3>
            <Link
              href={pageShell.backHref}
              className={cn(
                'hover:bg-neutral-1 text-neutral-5 hover:text-primary-6 ',
                'flex items-center justify-center rounded-full p-2 hover:shadow-bnb'
              )}
              aria-label="Back to contribute"
            >
              <CloseOutlined />
            </Link>
          </div>
          <FormContent
            config={config}
            sessionId={sessionId}
            pipeline={pipeline}
            progressSteps={progressSteps}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
        </div>
      </div>
    </ContributionPipelineProvider>
  );
}
