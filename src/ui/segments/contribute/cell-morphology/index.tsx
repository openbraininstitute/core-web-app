'use client';

import {
  CheckCircleFilled,
  InfoCircleFilled,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useMemo, useState, useCallback, Fragment, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Form } from 'antd';

import {
  DEFAULT_LICENSE_ID,
  DEFAULT_LICENSE_NAME,
  License,
} from '@/ui/segments/contribute/cell-morphology/license';
import { Contribution } from '@/ui/segments/contribute/cell-morphology/contribution';
import { MTypeClassification } from '@/ui/segments/contribute/cell-morphology/mtype';
import { AssetUpload } from '@/ui/segments/contribute/cell-morphology/asset-upload';
import { usePipeline } from '@/ui/segments/contribute/cell-morphology/use-pipeline';
import { useBrainRegionHierarchy } from '@/features/brain-region-hierarchy/context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { Subject } from '@/ui/segments/contribute/cell-morphology/subject';
import { AppUInterfaceSection, resolveDataKey } from '@/utils/key-builder';
import { Setup } from '@/ui/segments/contribute/cell-morphology/setup';
import { Protocol } from '@/ui/segments/contribute/cell-morphology/protocol';
import {
  SubmitButton,
  SubmitEntityProgress,
} from '@/ui/segments/contribute/cell-morphology/submit-entity';
import {
  CellMorphologySchema,
  getValidationStatus,
  type TCellMorphologyForm,
} from '@/ui/segments/contribute/cell-morphology/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { cn } from '@/utils/css-class';

type Props = {
  brainRegionId: string;
  sessionId: string;
};

export function FixModalCloseBug({
  expectedPath,
  children,
}: {
  expectedPath: string | RegExp;
  children: ReactNode;
}) {
  const pathname = usePathname();

  if (expectedPath instanceof RegExp) {
    if (expectedPath.test(pathname)) {
      return children;
    }
    return null;
  }
  // eslint-disable-next-line no-else-return
  else if (pathname.includes(expectedPath)) {
    return children;
  }
  return null;
}

const STEPS = {
  assets: 'assets',
  setup: 'setup',
  protocol: 'protocol',
  contribution: 'contribution',
  subject: 'subject',
  license: 'license',
  mtype: 'mtype',
} as const;

type StepKey = (typeof STEPS)[keyof typeof STEPS];

function UploadCellMorphology({ brainRegionId, sessionId }: Props) {
  const [form] = Form.useForm<TCellMorphologyForm>();
  const allValues = Form.useWatch([], form);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>(STEPS.assets);

  const getDirtyFields = useCallback(() => {
    const allFields = form.getFieldsValue(true);
    const touchedFields = Object.keys(allFields).filter((field) => form.isFieldTouched(field));

    return touchedFields;
  }, [form]);

  const onChangeStep = useCallback(
    (stepKey: StepKey) => {
      if (stepKey !== activeStep) {
        setActiveStep(stepKey);
      }
    },
    [activeStep]
  );

  const dirtyFields = getDirtyFields();
  const parseContribution = CellMorphologySchema.pick({ contribution: true }).safeParse(allValues);
  const parseMtype = CellMorphologySchema.pick({ mtype_class_id: true }).safeParse(allValues);
  const parseSubject = CellMorphologySchema.pick({ subject_id: true }).safeParse(allValues);
  const parseLicense = CellMorphologySchema.pick({ license_id: true }).safeParse(allValues);
  const parseAssets = CellMorphologySchema.pick({ assets: true }).safeParse(allValues);
  const parseSetup = CellMorphologySchema.pick({ setup: true }).safeParse(allValues);
  const parseProtocol = CellMorphologySchema.pick({ cell_morphology_protocol_id: true }).safeParse(
    allValues
  );

  const contributionStatus = getValidationStatus(parseContribution, 'contribution', dirtyFields);
  const licenseStatus = getValidationStatus(parseLicense, 'license_id', dirtyFields);
  const mtypeStatus = getValidationStatus(parseMtype, 'mtype_class_id', dirtyFields);
  const subjectStatus = getValidationStatus(parseSubject, 'subject_id', dirtyFields);
  const assetsStatus = getValidationStatus(parseAssets, 'assets', dirtyFields);
  const setupStatus = getValidationStatus(parseSetup, 'setup', dirtyFields);
  const protocolStatus = getValidationStatus(parseProtocol, 'protocol', dirtyFields);

  const steps = useMemo(
    () => [
      {
        key: 'assets',
        label: (
          <div
            className={cn('font-light', {
              'text-error': assetsStatus === 'invalid',
              'text-primary-8 font-bold': assetsStatus === 'valid',
              'text-primary-6': assetsStatus !== 'invalid' && activeStep === STEPS.assets,
            })}
          >
            Asset Upload
          </div>
        ),
        children: <AssetUpload />,
        icon: assetsStatus === 'valid' && <CheckCircleFilled className="text-teal-500" />,
      },
      {
        key: 'setup',
        label: (
          <div
            className={cn('font-light', {
              'text-error': setupStatus === 'invalid',
              'text-primary-8 font-bold': setupStatus === 'valid',
              'text-primary-6': setupStatus !== 'invalid' && activeStep === STEPS.setup,
            })}
          >
            Setup
          </div>
        ),
        children: <Setup />,
        icon: setupStatus === 'valid' && <CheckCircleFilled className="text-teal-500" />,
      },
      {
        key: 'protocol',
        label: (
          <div
            className={cn('font-light', {
              'text-error': protocolStatus === 'invalid',
              'text-primary-8 font-bold': protocolStatus === 'valid',
              'text-primary-6': protocolStatus !== 'invalid' && activeStep === STEPS.protocol,
            })}
          >
            Protocol
          </div>
        ),
        children: <Protocol />,
        icon: protocolStatus === 'valid' && <CheckCircleFilled className="text-teal-500" />,
      },
      {
        key: 'contribution',
        label: (
          <div
            className={cn('font-light', {
              'text-error': contributionStatus === 'invalid',
              'text-primary-8 font-bold': contributionStatus === 'valid',
              'text-primary-6':
                contributionStatus !== 'invalid' && activeStep === STEPS.contribution,
            })}
          >
            Contribution
          </div>
        ),
        children: <Contribution />,
        icon: contributionStatus === 'valid' && <CheckCircleFilled className="text-teal-500" />,
      },
      {
        key: 'subject',
        label: (
          <div
            className={cn('font-light', {
              'text-error': subjectStatus === 'invalid',
              'text-primary-8 font-bold': subjectStatus === 'valid',
              'text-primary-6': subjectStatus !== 'invalid' && activeStep === STEPS.subject,
            })}
          >
            Subject
          </div>
        ),
        children: <Subject />,
        icon: subjectStatus === 'valid' && <CheckCircleFilled className="text-teal-500" />,
      },
      {
        key: 'license',
        label: (
          <div
            className={cn('font-light', {
              'text-error': licenseStatus === 'invalid',
              'text-primary-8 font-bold': licenseStatus === 'valid',
              'text-primary-6': licenseStatus !== 'invalid' && activeStep === STEPS.license,
            })}
          >
            License
          </div>
        ),
        children: <License />,
        icon: (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* eslint-disable-next-line no-nested-ternary */}
              {licenseStatus === 'valid' ? (
                <CheckCircleFilled className="text-teal-500" />
              ) : licenseStatus === 'non-touched' ? (
                <InfoCircleFilled className="text-primary-8" />
              ) : null}
            </TooltipTrigger>
            {licenseStatus !== 'invalid' && (
              <TooltipContent
                side="bottom"
                sideOffset={0}
                avoidCollisions
                className={cn('bg-primary-8 z-[99999]', {
                  'bg-teal-500': licenseStatus === 'valid',
                })}
                arrowClassName={cn('text-primary-8', {
                  'text-teal-500': licenseStatus === 'valid',
                })}
              >
                {DEFAULT_LICENSE_NAME}
              </TooltipContent>
            )}
          </Tooltip>
        ),
      },
      {
        key: 'mtype',
        label: (
          <div
            className={cn('font-light', {
              'text-error': mtypeStatus === 'invalid',
              'text-primary-8 font-bold': mtypeStatus === 'valid',
              'text-primary-6': mtypeStatus !== 'invalid' && activeStep === STEPS.mtype,
            })}
          >
            M-Type
          </div>
        ),
        children: <MTypeClassification />,
        icon: mtypeStatus === 'valid' && <CheckCircleFilled className="text-teal-500" />,
      },
    ],
    [
      activeStep,
      assetsStatus,
      setupStatus,
      protocolStatus,
      contributionStatus,
      subjectStatus,
      licenseStatus,
      mtypeStatus,
    ]
  );

  const onPrevious = useCallback((): void => {
    const currentIndex = steps.findIndex((step) => step.key === activeStep);
    if (currentIndex > 0) {
      onChangeStep(steps[currentIndex - 1].key as StepKey);
    }
  }, [activeStep, steps, onChangeStep]);

  const onNext = useCallback((): void => {
    const currentIndex = steps.findIndex((step) => step.key === activeStep);
    if (currentIndex < steps.length - 1) {
      onChangeStep(steps[currentIndex + 1].key as StepKey);
    }
  }, [activeStep, steps, onChangeStep]);

  const { createEntity, loading: submitLoading } = usePipeline({
    sessionId: sessionId!,
  });

  const onSubmit = async (values: TCellMorphologyForm) => {
    setSubmitting(true);
    await createEntity({ values });
  };

  return (
    <div className={cn('relative mx-auto h-full w-full px-6 py-2')}>
      <Form
        form={form}
        id="contribute-cell-morphology-modal"
        rootClassName={cn(
          'relative flex flex-col w-full h-full [&_.ant-form-item-explain-error]:text-sm! ',
          '[&_.ant-form-item-explain-error]:pl-1.5! [&_.ant-form-item-explain-error]:select-none!'
        )}
        layout="vertical"
        requiredMark={false}
        className="h-full"
        validateTrigger={['onChange', 'onBlur']}
        autoComplete="false"
        onFinish={onSubmit}
        initialValues={{
          setup: { brain_region_id: brainRegionId },
          contribution: [{}],
          license_id: DEFAULT_LICENSE_ID,
          location: null,
        }}
      >
        <div className="mb-2 flex-shrink-0">
          <Breadcrumb>
            <BreadcrumbList className="justify-between gap-0.5 sm:gap-0.5">
              {steps.map((step, index) => (
                <Fragment key={step.key}>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild className={cn('hover:text-primary-6 cursor-pointer')}>
                      <Button
                        borderless
                        rounded
                        type="button"
                        variant="outline"
                        className={cn(
                          'active:text-primary-6 text-label active:bg-neutral-1 bg-transparent px-2 text-base shadow-none'
                        )}
                        onClick={() => onChangeStep(step.key as StepKey)}
                      >
                        {step.label}
                        {step.icon}
                      </Button>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {index < steps.length - 1 && (
                    <BreadcrumbSeparator>
                      <RightOutlined className="text-primary-9 size-2" />
                    </BreadcrumbSeparator>
                  )}
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="border-neutral-2 h-full max-h-[calc(100%-11rem)] min-h-0 flex-1 rounded-md border py-6 pr-1">
          {submitting ? (
            <div className="flex h-full w-full items-center justify-center">
              <SubmitEntityProgress sessionId={sessionId!} />
            </div>
          ) : (
            <div className="relative h-full w-full">
              {steps.map((step) => (
                <motion.div
                  key={step.key}
                  id={`cell-morphology-${step.key}`}
                  aria-labelledby={step.key}
                  aria-describedby={step.key}
                  aria-hidden={activeStep !== step.key}
                  initial={false}
                  animate={{
                    opacity: activeStep === step.key ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    pointerEvents: activeStep === step.key ? 'auto' : 'none',
                  }}
                  className={cn(
                    'secondary-scrollbar h-full flex-1 overflow-auto rounded-xl pr-4 pl-4',
                    activeStep === step.key ? 'relative' : 'absolute inset-0'
                  )}
                >
                  {step.children}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="flex w-full flex-shrink-0 items-center justify-between gap-2 py-3">
          <Button
            rounded
            variant="outline"
            className="text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb size-12 active:text-white"
            size="lg"
            type="button"
            onClick={onPrevious}
            disabled={activeStep === STEPS.assets}
          >
            <LeftOutlined />
          </Button>
          <SubmitButton loading={submitLoading} sessionId={sessionId!} />
          <Button
            rounded
            variant="outline"
            type="button"
            size="lg"
            className="text-primary-9 border-primary-9 disabled:border-neutral-1 shadow-bnb size-12 active:text-white"
            onClick={onNext}
            disabled={activeStep === STEPS.mtype}
          >
            <RightOutlined />
          </Button>
        </div>
      </Form>
    </div>
  );
}

export function CellMorphology({ sessionId }: { sessionId: string }) {
  const { projectId } = useWorkspace();
  const { node: defaultBrainRegion } = useBrainRegionHierarchy({
    dataKey: resolveDataKey({ section: AppUInterfaceSection.Data, projectId }),
  });

  return <UploadCellMorphology brainRegionId={defaultBrainRegion.id} sessionId={sessionId} />;
}
