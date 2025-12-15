import { useCallback, useMemo } from 'react';
import { Form } from 'antd';

import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';
import {
  renderLabel,
  createZodFieldValidator,
  RequiredFieldMarker,
} from '@/ui/segments/contribute/shared/helpers';

import type {
  PaginationFilter,
  SearchFilter,
} from '@/api/entitycore/types/shared/request';
import type { IProtocol } from '@/api/entitycore/types/shared/global';

export function Protocol() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

  const DataTooltip = useCallback((_data: IProtocol) => {
    const fields: string[] = [];

    if (fields.length === 0) {
      return (
        <div className="text-sm text-gray-500">No additional information</div>
      );
    }

    return (
      <div className="max-w-xs">
        <div className="space-y-1">
          {/* eslint-disable-next-line react/no-array-index-key */}
          {fields.map((field, index) => (
            <div
              key={index}
              className="text-sm text-white"
            >
              {field}
            </div>
          ))}
        </div>
      </div>
    );
  }, []);

  const ProtocolDropdown = useMemo(
    () =>
      AsyncSelectFormItem<PaginationFilter & SearchFilter, IProtocol>({
        id: 'protocol-selector',
        dataKey: keyBuilder.protocols({ virtualLabId, projectId }),
        queryFn: getProtocols,
        getOptionLabel: (l) => l.name + ' (' + l.generation_type + ')',
        getOptionValue: (l) => l.id,
        placeholder: 'Select a protocol...',
        searchPlaceholder: 'Search protocol...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'search',
        tooltip: DataTooltip,
      }),
    [virtualLabId, projectId, DataTooltip],
  );

  return (
    <Form.Item
      name="cell_morphology_protocol_id"
      label={renderLabel('Protocol', 'main', RequiredFieldMarker)}
      rules={[
        {
          required: true,
          validator: createZodFieldValidator(
            CellMorphologySchema,
            'cell_morphology_protocol_id',
            form,
          ),
        },
      ]}
    >
      <ProtocolDropdown />
    </Form.Item>
  );
}