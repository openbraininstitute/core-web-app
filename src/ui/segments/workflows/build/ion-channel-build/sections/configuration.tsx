'use client';

import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import type { ErrorSchema, RJSFSchema, RJSFValidationError, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { flatMap, isNil, map, toArray } from 'es-toolkit/compat';
import { useAtom } from 'jotai';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/ui/molecules/button';
import { EquationMenuItem } from '@/ui/segments/workflows/build/ion-channel-build/elements/equation-tooltip';
import { ConfigurationSidebar } from '@/ui/segments/workflows/build/ion-channel-build/elements/menu-sidebar';
import { GenerationWorkflowFormPanelKeys } from '@/ui/segments/workflows/build/ion-channel-build/elements/panel-tabs';
import {
  CONFIGURATION_FORM_STATE_KEY,
  CONFIGURATION_RECORDING_STATE_KEY,
  GenerativeFromAtomFamily,
  IonChannelModelingSharedStateFamily,
  IonChannelRecordingAtomFamily,
  useGenerativeFormSchemaApi,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import {
  type AutomatedFormHandle,
  SchemaGeneratedForm,
} from '@/ui/segments/workflows/build/ion-channel-build/rjsf';
import {
  type BlockGroupProperties,
  bundleSchemaFields,
  makeHiddenTypeUiSchema,
} from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';
import { resetFormSection } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/reset-form-block';
import { rjsfValidateForm } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/validate-form';
import { labelClasses } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/theme/classes';
import { cn } from '@/utils/css-class';
import { log } from '@/utils/logger';

const Recording = dynamic(
  () => import('@/ui/segments/workflows/build/ion-channel-build/elements/recording'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <LoadingOutlined />
      </div>
    ),
  }
);

type Props = {
  sessionId: string;
};

export function Configuration({ sessionId }: Props) {
  const { data: session } = useSession();
  const { data: RootSchema, isLoading } = useGenerativeFormSchemaApi({
    form: 'IonChannelFittingScanConfig',
  });

  const [formDataStorage, updateFormDataStorage] = useAtom(
    useMemo(
      () => GenerativeFromAtomFamily(`${CONFIGURATION_FORM_STATE_KEY}/${sessionId}`),
      [sessionId]
    )
  );

  const [recording, updateRecording] = useAtom(
    useMemo(
      () => IonChannelRecordingAtomFamily(`${CONFIGURATION_RECORDING_STATE_KEY}/${sessionId}`),
      [sessionId]
    )
  );

  const [, updateIoChannelState] = useAtom(
    useMemo(() => IonChannelModelingSharedStateFamily(sessionId), [sessionId])
  );
  const [validationErrorsMap, setValidationErrorsMap] = useState<ErrorSchema | undefined>(
    undefined
  );

  const [activeBlock, updateActiveBlock] = useState<string>('');
  const formRef = useRef<AutomatedFormHandle | null>(null);

  const BlockGroups: BlockGroupProperties = useMemo(() => {
    if (!RootSchema) return {};
    return bundleSchemaFields(RootSchema as RJSFSchema);
  }, [RootSchema]);

  const Blocks = useMemo(() => {
    return flatMap(toArray(BlockGroups), (group) => map(group, 'name'));
  }, [BlockGroups]);

  const baseUiSchema: UiSchema = useMemo(
    () => ({
      'ui:title': '',
      'ui:description': '',
      'ui:options': {
        hideDescription: true,
      },
      initialize: {
        'ui:title': '',
        'ui:options': {
          hideDescription: true,
        },
        type: {
          'ui:widget': 'hidden',
        },
        recordings: {
          'ui:options': {
            hideDescription: true,
          },
          'ui:field': 'RecordingsArrayField',
        },
      },
      info: {
        'ui:title': '',
        'ui:description': '',
        'ui:options': {
          hideDescription: true,
        },
        type: {
          'ui:widget': 'hidden',
        },
        campaign_name: {
          'ui:displayLabel': false,
          'ui:placeholder': 'Please enter a name',
          'ui:title': 'Name',
          'ui:options': {
            hideDescription: true,
          },
        },
        campaign_description: {
          'ui:displayLabel': false,
          'ui:placeholder': 'Please enter a description',
          'ui:title': 'Description',
          'ui:description': '',
          'ui:options': {
            hideDescription: true,
          },
        },
      },
      gate_exponents: {
        'ui:title': '',
        'ui:description:render-as-latex': true,
        type: {
          'ui:widget': 'hidden',
        },
        h_power: {
          'ui:widget': 'updown',
          'ui:placeholder': 'Enter h power',
          'ui:title-classname': '[&_span]:first-letter:lowercase',
          'ui:description:render-as-latex': true,
        },
        m_power: {
          'ui:widget': 'updown',
          'ui:placeholder': 'Enter m power',
          'ui:title-classname': '[&_span]:first-letter:lowercase',
          'ui:description:render-as-latex': true,
        },
      },
      minf_eq: {
        'ui:field': 'EquationSelectorField',
        'ui:classNames': 'w-full',
        'ui:renderField': 'latex_equation',
        'ui:emptyValue': null,
        'ui:options': {
          hideDescription: true,
        },
        type: {
          'ui:widget': 'hidden',
          'ui:emptyValue': null,
          'ui:options': {
            label: false,
            nullable: true,
          },
        },
      },
      mtau_eq: {
        'ui:field': 'EquationSelectorField',
        'ui:classNames': 'w-full',
        'ui:renderField': 'latex_equation',
        'ui:emptyValue': null,
        'ui:options': {
          hideDescription: true,
        },
        type: {
          'ui:widget': 'hidden',
          'ui:emptyValue': null,
          'ui:options': {
            label: false,
            nullable: true,
          },
        },
      },
      hinf_eq: {
        'ui:field': 'EquationSelectorField',
        'ui:classNames': 'w-full',
        'ui:renderField': 'latex_equation',
        'ui:emptyValue': null,
        'ui:options': {
          hideDescription: true,
        },
        type: {
          'ui:widget': 'hidden',
          'ui:emptyValue': null,
          'ui:options': {
            label: false,
          },
        },
      },
      htau_eq: {
        'ui:field': 'EquationSelectorField',
        'ui:classNames': 'w-full',
        'ui:renderField': 'latex_equation',
        'ui:emptyValue': null,
        'ui:options': {
          hideDescription: true,
        },
        type: {
          'ui:widget': 'hidden',
          'ui:emptyValue': null,
          'ui:options': {
            label: false,
          },
        },
      },
    }),
    []
  );

  // generate dynamic ui schema that hides all fields except the active block
  const dynamicUiSchema: UiSchema = useMemo(() => {
    if (!RootSchema || !activeBlock) return baseUiSchema;

    const hiddenTypeUi = makeHiddenTypeUiSchema(RootSchema as RJSFSchema);
    const uiSchema: UiSchema = { ...hiddenTypeUi, ...baseUiSchema };

    // hide all blocks except the active one using CSS classes
    for (const block of Blocks) {
      if (block !== activeBlock) {
        uiSchema[block] = {
          ...uiSchema[block],
          'ui:classNames': 'hidden',
        };
      } else {
        // make sure active block is visible
        uiSchema[block] = {
          ...uiSchema[block],
          'ui:classNames': 'block',
        };
      }
    }

    return uiSchema;
  }, [RootSchema, activeBlock, Blocks, baseUiSchema]);

  const activeFormLabel = useMemo(() => {
    if (!activeBlock) return '';
    for (const group of Object.keys(BlockGroups)) {
      const property = BlockGroups[group].find((prop) => prop.name === activeBlock);
      if (property) {
        return property.label;
      }
    }
    return activeBlock;
  }, [activeBlock, BlockGroups]);

  const canSubmitForm = useMemo(() => {
    return Blocks.every((propName) => {
      const errors = validationErrorsMap?.[propName] || [];
      return errors.length === 0;
    });
  }, [Blocks, validationErrorsMap]);

  const onFormError = useCallback((errors: RJSFValidationError[]) => {
    log('error', '[IonChannelModelBuilding][errors]', errors);
  }, []);

  const onFormChange = useCallback(
    (data: any, errorSchema?: ErrorSchema) => {
      updateFormDataStorage(data || {});
      setValidationErrorsMap(errorSchema);
    },
    [updateFormDataStorage]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const onResetForm = useCallback(
    (propName: string) => {
      if (propName === 'initialize') {
        updateRecording(null);
      }
      const result = resetFormSection({
        validator,
        formData: formDataStorage,
        path: propName,
        schema: RootSchema as RJSFSchema,
      });

      rjsfValidateForm({
        schema: RootSchema as RJSFSchema,
        data: result,
        callback: onFormChange,
      });
    },
    [formDataStorage, RootSchema, onFormChange, updateRecording]
  );

  const onFormSubmit = useCallback(async () => {
    if (!canSubmitForm) return;
    try {
      updateIoChannelState({
        panel: GenerationWorkflowFormPanelKeys.output,
        schema: RootSchema,
      });
    } catch (error) {
      log('error', '[Configuration]', error);
    }
  }, [canSubmitForm, RootSchema, updateIoChannelState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    formRef.current?.validate();
  }, []);

  useEffect(() => {
    if (Blocks.length > 0 && !activeBlock) {
      updateActiveBlock(Blocks[0]);
    }
  }, [Blocks, activeBlock]);

  const disableSubmit = !canSubmitForm;

  if (isLoading) return null;
  return (
    <div className="flex h-[calc(100vh-11rem)] w-full">
      <div className="bg-background flex w-80 flex-shrink-0 flex-col">
        <ConfigurationSidebar
          blockGroups={BlockGroups}
          activeBlock={activeBlock}
          errorSchema={validationErrorsMap}
          onBlockChange={updateActiveBlock}
          CustomRender={EquationMenuItem}
        />

        <div className="mt-auto px-2 py-2">
          <Button
            variant={canSubmitForm ? 'shadow' : 'outline'}
            rounded
            type="submit"
            onClick={onFormSubmit}
            // disabled={disableSubmit}
            className={cn('h-10 w-full select-none lg:h-12', {
              'shadow-bnb': !disableSubmit,
            })}
          >
            Build model
          </Button>
        </div>
      </div>
      <div className="grid h-full w-full grid-cols-2 gap-3">
        <div className="bg-background flex h-full flex-col overflow-hidden">
          {activeBlock ? (
            <div className="h-full w-full">
              <div className="text-label bg-background flex items-center justify-between px-6 pb-4">
                <h2 className="text-xl! font-semibold select-none lg:text-2xl">
                  {activeFormLabel}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResetForm(activeBlock)}
                  className={cn(
                    'size-10! min-h-10! min-w-10! rounded-full md:size-10!',
                    'md:min-h-10! md:min-w-10! lg:size-12! lg:min-h-12! lg:min-w-12!'
                  )}
                >
                  <CloseOutlined />
                </Button>
              </div>

              <div className="secondary-scrollbar bg-background h-[calc(100%-3.5rem)] w-full flex-1 overflow-y-auto px-6">
                {RootSchema && (
                  <SchemaGeneratedForm
                    noHtml5Validate
                    ref={formRef}
                    liveValidate
                    className="w-full"
                    showErrorList={false}
                    renderSubmitButton={false}
                    schema={RootSchema as RJSFSchema}
                    uiSchema={dynamicUiSchema}
                    formData={formDataStorage}
                    onChange={onFormChange}
                    onSubmit={onFormSubmit}
                    onError={onFormError}
                    experimental_defaultFormStateBehavior={{
                      emptyObjectFields: 'populateRequiredDefaults',
                    }}
                    formContext={{ sessionId }}
                  />
                )}
                {activeBlock === 'info' && (
                  <div className="mt-10 flex flex-col gap-5 select-none">
                    <div className="flex flex-col">
                      <div className={cn(labelClasses, 'uppercase')}>Created By</div>
                      <div className="text-neutral-4 text-lg font-bold">
                        {session?.user.name ?? session?.user.username}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className={cn(labelClasses, 'uppercase')}>Created on</div>
                      <div className="text-neutral-4 text-lg font-bold">
                        {new Intl.DateTimeFormat('en-US').format(new Date())}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a parameter to configure
            </div>
          )}
        </div>
        <div
          className={cn(
            'secondary-scrollbar h-full max-h-[calc(100%-.5rem)] overflow-x-hidden overflow-y-auto rounded-2xl',
            'rounded-2xl border-white bg-white p-4 shadow-xs'
          )}
        >
          {!isNil(recording) && <Recording sessionId={sessionId} />}
        </div>
      </div>
    </div>
  );
}
