import React, { useCallback } from 'react';
import { Form } from 'antd';
import isNil from 'lodash/isNil';
/* 
import { getSpecies } from '@/api/entitycore/queries/general/species';
import { SelectPopoverFormItem } from '@/ui/molecules/select-popover';
import { getStrains } from '@/api/entitycore/queries/general/strain'; */
import { getSubjects } from '@/api/entitycore/queries/general/subject';
import {
  CellMorphologySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/explore/contribute/cell-morphology/helpers';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import {
  AgePeriod,
  Sex,
  /* AgePeriod,
  Sex,
  type TAgePeriod,
  type TSex,
  type ISpecies,
  type IStrain,
  IMType, */
  type ISubject,
} from '@/api/entitycore/types/shared/global';

export function Subject() {
  const form = Form.useFormInstance();
  const DataTooltip = useCallback((data: ISubject) => {
    const fields = [];
    if (data.strain?.name) {
      fields.push(`Strain: ${data.strain.name}`);
    }
    if (data.species?.name) {
      fields.push(`Species: ${data.species.name}`);
    }
    if (data.sex) {
      const sexLabel = Object.values(Sex).find((sex) => sex.key === data.sex)?.label;
      fields.push(`Sex: ${sexLabel}`);
    }
    if (!isNil(data.weight)) {
      fields.push(`Weight: ${data.weight}g`);
    }
    if (!isNil(data.age_value)) {
      fields.push(`Age: ${data.age_value} days`);
    }
    if (!isNil(data.age_min) && !isNil(data.age_max)) {
      fields.push(`Age Range: ${data.age_min}-${data.age_max} days`);
    } else {
      if (!isNil(data.age_min)) {
        fields.push(`Min Age: ${data.age_min} days`);
      }
      if (!isNil(data.age_max)) {
        fields.push(`Max Age: ${data.age_max} days`);
      }
    }

    if (data.age_period && data.age_period !== 'unknown') {
      const periodLabel = Object.values(AgePeriod).find(
        (period) => period.key === data.age_period
      )?.label;
      fields.push(`Age Period: ${periodLabel}`);
    }

    if (fields.length === 0) {
      return <div className="text-sm text-gray-500">No additional information</div>;
    }

    return (
      <div className="max-w-xs">
        <div className="space-y-1">
          {fields.map((field, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={`subject-data-info-${index}`} className="text-sm text-white">
              {field}
            </div>
          ))}
        </div>
      </div>
    );
  }, []);

  const SubjectDropdown = AsyncSelectFormItem<PaginationFilter & SearchFilter, ISubject>({
    dataKey: ['subjects'],
    queryFn: getSubjects,
    getOptionLabel: (l) => l.name,
    getOptionValue: (l) => l.id,
    placeholder: 'Select a subject...',
    searchPlaceholder: 'Search subject...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
    searchable: false,
    tooltip: DataTooltip,
  });

  return (
    <Form.Item
      name="subject_id"
      label={label('Subject', 'main', <sup className="text-destructive">*</sup>)}
      rules={[
        {
          required: true,
          validator: zodFieldValidator(CellMorphologySchema, 'subject_id', form),
        },
      ]}
    >
      <SubjectDropdown />
    </Form.Item>
  );
}

/* export function SubjectV2({}: Props) {
  const form = Form.useFormInstance();

  const ageValue = Form.useWatch(['subject', 'age_value'], form);
  const ageMin = Form.useWatch(['subject', 'age_min'], form);
  const ageMax = Form.useWatch(['subject', 'age_max'], form);

  const isSingleAgeMode = !isNil(ageValue);
  const isRangeMode = !isNil(ageMin) || !isNil(ageMax);

  React.useEffect(() => {
    if (isSingleAgeMode && isRangeMode) {
      form.setFieldsValue({
        'subject.age_min': null,
        'subject.age_max': null,
      });
    }
  }, [isSingleAgeMode, isRangeMode, form]);

  const StrainFormInput = AsyncSelectFormItem<PaginationFilter & SearchFilter, IStrain>({
    searchable: true,
    dataKey: 'strain',
    searchField: 'name__ilike',
    queryFn: getStrains,
    getOptionLabel: (strain) => strain.name,
    getOptionValue: (strain) => strain.id,
    placeholder: 'Select a strain...',
    searchPlaceholder: 'Search strains...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
  });

  const SpeciesFormInput = AsyncSelectFormItem<PaginationFilter & SearchFilter, ISpecies>({
    dataKey: 'species',
    queryFn: getSpecies,
    searchField: 'name__ilike',
    searchable: true,
    getOptionLabel: (species) => species.name,
    getOptionValue: (species) => species.id,
    placeholder: 'Select a species...',
    searchPlaceholder: 'Search species...',
    clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
  });

  const SexFormInput = SelectPopoverFormItem<TSex>({
    options: Object.entries(Sex).map(([key, value]) => ({
      label: value.label,
      value: value.key,
    })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  const AgePeriodFormInput = SelectPopoverFormItem<TAgePeriod>({
    options: Object.entries(AgePeriod).map(([key, value]) => ({
      label: value.label,
      value: value.key,
    })),
    clsx: { trigger: 'rounded-full w-full h-12', content: 'z-[99999]' },
  });

  return (
    <div className="mb-5 h-full w-full">
      <Form.Item
        name={['subject', 'name']}
        label={label('Name', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(CellMorphologySchema, 'subject.name', form),
          },
        ]}
      >
        <Input
          className={cn(
            'group h-12 w-full rounded-full',
            'hover:border-primary-9 hover:border-2',
            'focus-visible:border-primary-9 focus-visible:border-2',
            'focus-within:border-primary-9 focus-within:border-2'
          )}
          size="large"
        />
      </Form.Item>
      <Form.Item
        name={['subject', 'description']}
        label={label('Description', 'main', <sup className="text-destructive">*</sup>)}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(CellMorphologySchema, 'subject.description', form),
          },
        ]}
      >
        <Input.TextArea
          className={cn(
            'group h-12 w-full rounded-xl',
            'hover:border-primary-9 hover:border-2',
            'focus-visible:border-primary-9 focus-visible:border-2',
            'focus-within:border-primary-9 focus-within:border-2'
          )}
          rows={4}
        />
      </Form.Item>
      <Form.Item
        name={['subject', 'sex']}
        label={label('Sex', 'main')}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(CellMorphologySchema, 'subject.sex', form),
          },
        ]}
      >
        <SexFormInput />
      </Form.Item>
      <Form.Item
        name={['subject', 'species_id']}
        label={label('Species', 'main')}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(CellMorphologySchema, 'subject.species_id', form),
          },
        ]}
      >
        <SpeciesFormInput />
      </Form.Item>
      <Form.Item
        name={['subject', 'strain_id']}
        label={label('Strain', 'main')}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(CellMorphologySchema, 'subject.strain_id', form),
          },
        ]}
      >
        <StrainFormInput />
      </Form.Item>
      <div className="flex w-full items-center justify-center gap-2">
        <Form.Item
          name={['subject', 'age_period']}
          label={label('Age period', 'main')}
          className="w-1/2"
          rules={[
            {
              required: true,
              validator: zodFieldValidator(CellMorphologySchema, 'subject.age_period', form),
            },
          ]}
        >
          <AgePeriodFormInput />
        </Form.Item>
        <Form.Item
          name={['subject', 'age_value']}
          label={label('Age', 'main')}
          className="w-1/2"
          rules={[
            {
              required: !isRangeMode,
              validator: zodFieldValidator(CellMorphologySchema, 'subject.age_value', form),
            },
          ]}
        >
          <InputNumber
            className={cn(
              'group h-12 w-full rounded-full',
              'hover:border-primary-9 hover:border-2',
              'focus-visible:border-primary-9 focus-visible:border-2',
              'focus-within:border-primary-9 focus-within:border-2'
            )}
            size="large"
            controls={false}
            disabled={isRangeMode}
            suffix={<span className="text-primary-9 -mt-0.5 pl-1 text-sm font-bold">days</span>}
          />
        </Form.Item>
      </div>
      <div className="flex w-full items-center justify-center gap-2">
        <Form.Item
          name={['subject', 'age_min']}
          label={label('Age min', 'main')}
          rules={[
            {
              required: !isSingleAgeMode,
              validator: zodFieldValidator(CellMorphologySchema, 'subject.age_min', form),
            },
          ]}
          className="w-full"
        >
          <InputNumber
            className={cn(
              'group h-12 w-full rounded-full',
              'hover:border-primary-9 hover:border-2',
              'focus-visible:border-primary-9 focus-visible:border-2',
              'focus-within:border-primary-9 focus-within:border-2'
            )}
            size="large"
            controls={false}
            disabled={isSingleAgeMode}
            suffix={<span className="text-primary-9 -mt-0.5 pl-1 text-sm font-bold">days</span>}
          />
        </Form.Item>
        <Form.Item
          name={['subject', 'age_max']}
          label={label('Age max', 'main')}
          rules={[
            {
              required: !isSingleAgeMode,
              validator: zodFieldValidator(CellMorphologySchema, 'subject.age_max', form),
            },
          ]}
          className="w-full"
        >
          <InputNumber
            className={cn(
              'group h-12 w-full rounded-full',
              'hover:border-primary-9 hover:border-2',
              'focus-visible:border-primary-9 focus-visible:border-2',
              'focus-within:border-primary-9 focus-within:border-2'
            )}
            size="large"
            controls={false}
            disabled={isSingleAgeMode}
            suffix={<span className="text-primary-9 -mt-0.5 pl-1 text-sm font-bold">days</span>}
          />
        </Form.Item>
      </div>
      <Form.Item
        name={['subject', 'weight']}
        label={label('Weight', 'main')}
        rules={[
          {
            required: true,
            validator: zodFieldValidator(CellMorphologySchema, 'subject.weight', form),
          },
        ]}
        className="w-full"
      >
        <InputNumber
          suffix={<span className="text-primary-9 -mt-0.5 pl-1 text-lg font-bold">g</span>}
          controls={false}
          className={cn(
            'group h-12 w-full rounded-full',
            'hover:border-primary-9 hover:border-2',
            'focus-visible:border-primary-9 focus-visible:border-2',
            'focus-within:border-primary-9 focus-within:border-2'
          )}
          size="large"
        />
      </Form.Item>
    </div>
  );
}
 */
