import type Form from '@rjsf/core';
import type { FormProps, IChangeEvent } from '@rjsf/core';
import { withTheme } from '@rjsf/core';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { type ErrorSchema, getDefaultFormState, toErrorSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { type RefObject, useEffect, useImperativeHandle, useRef } from 'react';
import { useLatest } from '@/ui/hooks/use-latest';
import { theme } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/theme/default';
import { log } from '@/utils/logger';

const ThemedForm = withTheme(theme);

export interface AutomatedFormProps extends Omit<FormProps, 'onChange' | 'validator' | 'ref'> {
  onChange?: (formData: any, errorSchema?: ErrorSchema) => void;
  renderSubmitButton?: boolean;
  ref: RefObject<AutomatedFormHandle | null>;
}

export interface AutomatedFormHandle {
  validate: () => boolean;
}

// export const SchemaGeneratedForm = forwardRef<AutomatedFormHandle, AutomatedFormProps>(
export function SchemaGeneratedForm({
  onChange,
  schema,
  uiSchema = {},
  formData,
  renderSubmitButton,
  ref,
  ...rest
}: AutomatedFormProps) {
  const onChangeRef = useLatest(onChange);
  const formDataRef = useLatest(formData);
  const formRef = useRef<Form>(null);

  useEffect(() => {
    if (schema) {
      const formDataWithDefaults = getDefaultFormState(
        validator,
        schema,
        formDataRef.current,
        schema,
        true,
      );

      // Validate the initial form data
      let errorSchema: ErrorSchema = {} as ErrorSchema;
      try {
        const validationResult = validator.validateFormData(
          formDataWithDefaults,
          schema as RJSFSchema,
        );

        if (validationResult.errors && validationResult.errors.length > 0) {
          errorSchema = toErrorSchema(validationResult.errors);
        }
      } catch (error) {
        log('error', '[AutomatedForm] Initial validation error:', error);
      }

      onChangeRef?.current?.(formDataWithDefaults, errorSchema);
    }
  }, [formDataRef, onChangeRef, schema]);

  const mergedUiSchema: UiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: !renderSubmitButton,
    },
  };

  const onRJSFChange = (e: IChangeEvent) => {
    // eslint-disable-next-line prefer-destructuring
    let errorSchema: ErrorSchema | undefined = e.errorSchema;

    if (schema && e.formData !== undefined) {
      try {
        const validationResult = validator.validateFormData(e.formData, schema as RJSFSchema);

        if (validationResult.errors && validationResult.errors.length > 0) {
          errorSchema = toErrorSchema(validationResult.errors);
        } else {
          errorSchema = {} as ErrorSchema; // No errors
        }
      } catch (error) {
        log('error', '[AutomatedForm] Validation error:', error);
      }
    }

    onChange?.(e.formData, errorSchema);
  };

  useImperativeHandle(ref, () => ({
    validate: () => {
      return formRef.current?.validateForm() || false;
    },
  }));

  return (
    <ThemedForm
      ref={formRef}
      onChange={onRJSFChange}
      schema={schema}
      validator={validator}
      uiSchema={mergedUiSchema}
      formData={formData}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
      className="w-full"
    />
  );
}
