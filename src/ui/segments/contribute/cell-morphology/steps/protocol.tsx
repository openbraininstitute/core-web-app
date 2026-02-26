import { Form, Select } from 'antd';
import { upperFirst } from 'lodash'; // Assuming lodash is available for sentence case
import { useCallback, useMemo } from 'react';

import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  CellMorphologySchema,
  RepairPipelineType, // Updated import
} from '@/ui/segments/contribute/cell-morphology/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IProtocol } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import type { AsyncSelectOption } from '@/ui/molecules/async-select';

// Map the dictionary to Select options
const REPAIR_PIPELINE_OPTIONS = Object.values(RepairPipelineType).map(({ key, label }) => ({
  label: upperFirst(label),
  value: key,
}));

export function Protocol() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

  const selectedProtocolGenerationType = Form.useWatch('_protocol_generation_type', form);
  const isDigitalReconstruction = selectedProtocolGenerationType === 'digital_reconstruction';

  const handleProtocolSelect = useCallback(
    (option: AsyncSelectOption<IProtocol> | undefined) => {
      const generationType = option?.data?.generation_type ?? null;
      form.setFieldValue('_protocol_generation_type', generationType);

      // Reset pipeline state if protocol is not digital reconstruction
      if (generationType !== 'digital_reconstruction') {
        form.setFieldValue('repair_pipeline_state', undefined);
      }
    },
    [form]
  );

  const ProtocolDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, IProtocol>({
        id: 'protocol-selector',
        dataKey: keyBuilder.protocols({ virtualLabId, projectId }),
        queryFn: getProtocols,
        getOptionLabel: (l) => `${l.name} (${l.generation_type})`,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a protocol...',
        searchPlaceholder: 'Search protocol...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'search',
        tooltip: null,
        onSelect: handleProtocolSelect,
      }),
    [virtualLabId, projectId, handleProtocolSelect]
  );

  return (
    <>
      <Form.Item
        name="cell_morphology_protocol_id"
        label={renderLabel('Protocol', 'main', RequiredFieldMarker)}
        rules={[
          {
            required: true,
            validator: createZodFieldValidator(
              CellMorphologySchema,
              'cell_morphology_protocol_id',
              form
            ),
          },
        ]}
      >
        <ProtocolDropdown />
      </Form.Item>

      {/* Hidden helper field — stores selected protocol's generation_type */}
      <Form.Item name="_protocol_generation_type" hidden noStyle>
        <input type="hidden" />
      </Form.Item>

      {isDigitalReconstruction && (
        <Form.Item name="repair_pipeline_state" label={renderLabel('Repair pipeline type', 'main')}>
          <Select
            placeholder="Select a repair pipeline type..."
            options={REPAIR_PIPELINE_OPTIONS}
            allowClear
            popupClassName="z-[99999]"
          />
        </Form.Item>
      )}
    </>
  );
}
