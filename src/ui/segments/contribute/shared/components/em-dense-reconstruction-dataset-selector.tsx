'use client';

import { Form } from 'antd';
import { useMemo } from 'react';

import { getEmDenseReconstructionDatasets } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ZodObject, ZodRawShape } from 'zod';
import type { IEmDenseReconstructionDataset } from '@/api/entitycore/types/entities/em-dense-reconstruction-dataset';
import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';

interface IDatasetSelectorProps<TSchema extends ZodObject<ZodRawShape>> {
  schema: TSchema;
}

export function EMDenseReconstructionDatasetSelector<TSchema extends ZodObject<ZodRawShape>>({
  schema,
}: IDatasetSelectorProps<TSchema>) {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

  const DatasetDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, IEmDenseReconstructionDataset>({
        id: 'dataset-selector',
        dataKey: keyBuilder.emDenseReconstructionDatasets({ virtualLabId, projectId }),
        queryFn: getEmDenseReconstructionDatasets,
        getOptionLabel: (d) => d.name,
        getOptionValue: (d) => d.id,
        placeholder: 'Select a dataset...',
        searchPlaceholder: 'Search datasets...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'ilike_search',
      }),
    [virtualLabId, projectId]
  );

  return (
    <Form.Item
      name={['setup', 'em_dense_reconstruction_dataset_id']}
      label={renderLabel('EM Dense Reconstruction Dataset', 'main', RequiredFieldMarker)}
      rules={[
        {
          required: true,
          validator: createZodFieldValidator(
            schema,
            'setup.em_dense_reconstruction_dataset_id',
            form
          ),
        },
      ]}
    >
      <DatasetDropdown />
    </Form.Item>
  );
}
