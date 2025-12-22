/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable object-shorthand */
/* eslint-disable no-nested-ternary */
/* eslint-disable prefer-destructuring */

import renderMathInElement from 'katex/contrib/auto-render';
import { ObjectFieldTemplateProps } from '@rjsf/utils';
import type { ThemeProps } from '@rjsf/core';
import { get } from 'es-toolkit/compat';
import { useCallback } from 'react';
import {
  getInputProps,
  type BaseInputTemplateProps,
  type FieldTemplateProps,
  type MultiSchemaFieldTemplateProps,
  type RegistryFieldsType,
  type RegistryWidgetsType,
  type WidgetProps,
} from '@rjsf/utils';

import { EquationSelectorField } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/theme/widgets/equation-selector-card';
import { RecordingsArrayField } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/theme/fields/ion-channel-recordings';
import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers/render-mathematic-symbol';
import {
  descriptionClasses,
  errorClasses,
  labelClasses,
  parentDescriptionClasses,
} from '@/ui/segments/workflows/build/ion-channel-build/rjsf/theme/classes';
import { Textarea } from '@/ui/molecules/input/text-area';
import { Input } from '@/ui/molecules/input';
import { cn } from '@/utils/css-class';
import {
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
  Select,
} from '@/ui/molecules/select';

import 'katex/dist/katex.min.css';

function CustomSelectWidget(props: WidgetProps) {
  const { value, onChange, disabled, required, options, rawErrors } = props;
  const { enumOptions } = options;

  const isInvalid = rawErrors && rawErrors.length > 0;

  return (
    <Select
      value={value != null ? String(value) : ''}
      onValueChange={(val) => onChange(val)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn('border-label w-full', 'h-10! lg:h-12!', {
          'aria-invalid': isInvalid,
        })}
        aria-label="rjsf-select"
        aria-required={required}
      >
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent className="border-label bg-white">
        {(enumOptions || []).map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CustomTextareaWidget(props: WidgetProps) {
  const { id, value, onChange, disabled, readonly, required, placeholder, rawErrors, autofocus } =
    props;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const isInvalid = rawErrors && rawErrors.length > 0;

  return (
    <Textarea
      id={id}
      value={value ?? ''}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      autoFocus={autofocus}
      onChange={handleChange}
      aria-invalid={isInvalid}
      className={cn('w-full', {
        'aria-invalid:ring-destructive/20 aria-invalid:border-destructive': isInvalid,
      })}
    />
  );
}

function HiddenWidget({ value }: WidgetProps) {
  return <input type="hidden" value={value} />;
}

function BaseInputTemplate(props: BaseInputTemplateProps) {
  const {
    id,
    value,
    onChange,
    onChangeOverride,
    onBlur,
    onFocus,
    options,
    required,
    disabled,
    readonly,
    autofocus,
    placeholder,
    rawErrors,
    schema,
    type,
  } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChangeOverride) {
      onChangeOverride(e);
    } else {
      const val = e.target.value;
      onChange(val === '' ? options.emptyValue || '' : val);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      onBlur(id, e.target.value);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (onFocus) {
      onFocus(id, e.target.value);
    }
  };

  const isInvalid = rawErrors && rawErrors.length > 0;
  const inputProps = getInputProps(schema, type, options);

  return (
    <Input
      id={id}
      value={value ?? ''}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      readOnly={readonly}
      autoFocus={autofocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      aria-invalid={isInvalid}
      className={cn(
        'h-10! w-full bg-white! lg:h-12!',
        'text-primary-9! text-base! font-bold lg:text-lg!',
        'border-label placeholder:text-sm placeholder:font-light',
        {
          'aria-invalid:ring-destructive/20 aria-invalid:border-destructive': isInvalid,
        }
      )}
      {...inputProps}
    />
  );
}

function MultiSchemaFieldTemplate(props: MultiSchemaFieldTemplateProps) {
  const { optionSchemaField, selector, uiSchema } = props;

  // if a custom field is specified, don't render anything from MultiSchemaFieldTemplate
  // the custom field will handle all the anyOf/oneOf rendering logic
  const hasCustomField = uiSchema?.['ui:field'];

  if (hasCustomField) {
    // the custom field will be rendered by RJSF's field rendering logic
    return null;
  }

  // render both selector and option
  return (
    <div>
      <div>{selector}</div>
      {optionSchemaField}
    </div>
  );
}

function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    classNames,
    style,
    label,
    help,
    required,
    description,
    rawDescription,
    errors,
    children,
    displayLabel,
    hidden,
    schema,
    registry,
    rawErrors,
    rawHelp,
    uiSchema,
  } = props;
  const isHiddenWidget = uiSchema?.['ui:widget'] === 'hidden';
  const titleClassname = uiSchema?.['ui:title-classname'] as string;
  const renderDescriptionLatex = uiSchema?.['ui:description:render-as-latex'] as boolean;
  const shouldHideTitle = get(uiSchema, 'ui:options.hideLabel', false);
  const shouldHideDescription = get(uiSchema, 'ui:options.hideDescription', false);

  const units = get(schema, 'units', null);
  const parentRenderedDescription =
    !displayLabel && schema?.description && rawDescription === schema?.description;

  const displayDescription =
    schema?.type !== 'boolean' &&
    description &&
    rawDescription &&
    !shouldHideDescription &&
    !parentRenderedDescription;
  const canDisplayLabel = schema?.type === 'boolean' || displayLabel;

  const renderLatex = useCallback((node: HTMLDivElement) => {
    renderMathInElement(node, {
      delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }, []);

  if (hidden || isHiddenWidget) {
    return <div style={{ display: 'none' }}>{children}</div>;
  }

  const WrapIfAdditionalTemplate = registry.templates.WrapIfAdditionalTemplate;
  return (
    <div className={cn('mb-2', classNames)} style={{ ...style }}>
      <WrapIfAdditionalTemplate {...props}>
        {canDisplayLabel && label && (
          <>
            <label
              htmlFor={id}
              className={cn(
                labelClasses,
                'flex items-start justify-between uppercase',
                titleClassname
              )}
            >
              <span className="w-full">
                {shouldHideTitle
                  ? null
                  : typeof label === 'string'
                    ? renderMathInText(label)
                    : label}
                {required && <span className="ml-1 text-red-500">*</span>}
              </span>
              {units && (
                <span className="text-xs font-light! text-[--hl] normal-case">{units}</span>
              )}
            </label>
          </>
        )}
        {displayDescription && (
          <div
            className={cn(descriptionClasses)}
            ref={(node) => {
              if (node && renderDescriptionLatex) renderLatex(node);
            }}
          >
            {rawDescription}
          </div>
        )}
        <div className="w-full">{children}</div>
        {rawErrors && <div className={errorClasses}>{errors}</div>}
        {rawHelp && <div className="mt-1 text-xs text-[--hl]">{help}</div>}
      </WrapIfAdditionalTemplate>
    </div>
  );
}

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties, uiSchema } = props;
  const hideDescription = uiSchema?.['ui:options']?.hideDescription ?? false;
  const renderDescriptionLatex = uiSchema?.['ui:description:render-as-latex'] as boolean;

  const renderLatex = useCallback((node: HTMLDivElement) => {
    renderMathInElement(node, {
      delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }, []);

  return (
    <div className="rjsf-object-field">
      {title && <h3 className="text-lg font-bold">{title}</h3>}

      {!hideDescription && description && renderDescriptionLatex && (
        <div
          ref={(node) => {
            if (node) renderLatex(node);
          }}
          className={cn(parentDescriptionClasses, 'mb-4 text-left')}
        >
          {description}
        </div>
      )}
      {!hideDescription && description && !renderDescriptionLatex && (
        <div className={cn(parentDescriptionClasses, 'mb-4')}>{description}</div>
      )}

      <div className="rjsf-object-properties">{properties.map((element) => element.content)}</div>
    </div>
  );
}

const themeWidgets: RegistryWidgetsType = {
  SelectWidget: CustomSelectWidget,
  TextareaWidget: CustomTextareaWidget,
  hidden: HiddenWidget,
};

const themeFields: RegistryFieldsType = {
  EquationSelectorField: EquationSelectorField,
  RecordingsArrayField: RecordingsArrayField,
};

const themeTemplates = {
  BaseInputTemplate,
  MultiSchemaFieldTemplate,
  FieldTemplate,
  ObjectFieldTemplate,
};

const ThemeObject: ThemeProps = {
  widgets: themeWidgets,
  fields: themeFields,
  templates: themeTemplates,
};

export { ThemeObject as theme };
