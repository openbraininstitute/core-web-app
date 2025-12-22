/* eslint-disable react/destructuring-assignment */

'use client';

import { useCallback, useMemo } from 'react';
import { isNil } from 'es-toolkit/compat';
import { Form } from 'antd';
import type { ZodObject, ZodRawShape } from 'zod';

import { getSubjects } from '@/api/entitycore/queries/general/subject';
import { AgePeriod, Sex } from '@/api/entitycore/types/shared/global';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  renderLabel,
  createZodFieldValidator,
  RequiredFieldMarker,
} from '@/ui/segments/contribute/shared/helpers';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { ISubject } from '@/api/entitycore/types/shared/global';

interface ISubjectSelectorProps<TSchema extends ZodObject<ZodRawShape>> {
  schema: TSchema;
}

function SubjectDataTooltip(data: ISubject) {
  const fields: Array<string> = [];

  if (data.strain?.name) {
    fields.push(`Strain: ${data.strain.name}`);
  }
  if (data.species?.name) {
    fields.push(`Species: ${data.species.name}`);
  }
  if (data.sex) {
    const sexLabel = Object.values(Sex).find((sex) => sex.key === data.sex)?.label;
    if (sexLabel) fields.push(`Sex: ${sexLabel}`);
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
    if (periodLabel) fields.push(`Age Period: ${periodLabel}`);
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
}

export function SubjectSelector<TSchema extends ZodObject<ZodRawShape>>({
  schema,
}: ISubjectSelectorProps<TSchema>) {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

  const tooltipRenderer = useCallback((data: ISubject) => SubjectDataTooltip(data), []);

  const SubjectDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, ISubject>({
        id: 'subject-selector',
        dataKey: keyBuilder.subjects({ virtualLabId, projectId }),
        queryFn: getSubjects,
        getOptionLabel: (l) => l.name,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a subject...',
        searchPlaceholder: 'Search subject...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'search',
        tooltip: tooltipRenderer,
      }),
    [virtualLabId, projectId, tooltipRenderer]
  );

  return (
    <Form.Item
      name="subject_id"
      label={renderLabel('Subject', 'main', RequiredFieldMarker)}
      rules={[
        {
          required: true,
          validator: createZodFieldValidator(schema, 'subject_id', form),
        },
      ]}
    >
      <SubjectDropdown />
    </Form.Item>
  );
}
