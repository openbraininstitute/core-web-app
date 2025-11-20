import { useCallback, useMemo } from 'react';
import { Form } from 'antd';
import isNil from 'es-toolkit/compat/isNil';
import { getSubjects } from '@/api/entitycore/queries/general/subject';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  ExperimentalNeuronDensitySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/contribute/experimental-neuron-density/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import {
  AgePeriod,
  Sex,
  type ISubject,
} from '@/api/entitycore/types/shared/global';

export function Subject() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

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

  const SubjectDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, ISubject>({
        id: 'subject-selector',
        dataKey: keyBuilder.subject({ virtualLabId, projectId }),
        queryFn: getSubjects,
        getOptionLabel: (l) => l.name,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a subject...',
        searchPlaceholder: 'Search subject...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'search',
        tooltip: DataTooltip,
      }),
    [virtualLabId, projectId, DataTooltip]
  );

  return (
    <Form.Item
      name="subject_id"
      label={label('Subject', 'main', <sup className="text-destructive">*</sup>)}
      rules={[
        {
          required: true,
          validator: zodFieldValidator(ExperimentalNeuronDensitySchema, 'subject_id', form),
        },
      ]}
    >
      <SubjectDropdown />
    </Form.Item>
  );
}

