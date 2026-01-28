'use client';

import { Form } from 'antd';
import { useMemo } from 'react';
import type { ZodObject, ZodRawShape } from 'zod';

import { getEmDenseReconstructionDatasets } from '@/api/entitycore/queries/general/em-dense-reconstruction-dataset';
import type { IEMDenseReconstructionDataset } from '@/api/entitycore/types/shared/global';
import type { IlikeSearchFilter, PaginationFilter } from '@/api/entitycore/types/shared/request';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

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
      AsyncSelectFormItem<PaginationFilter & SearchFilter, IEMDenseReconstructionDataset>({
        id: 'dataset-selector',
        // Ensure your keyBuilder has a method for these datasets,
        // otherwise use a generic key like ['em-datasets', virtualLabId, projectId]
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
