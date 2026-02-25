import { Form } from 'antd';
import { useMemo } from 'react';

import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import { CellMorphologySchema } from '@/ui/segments/contribute/cell-morphology/schema';
import {
  createZodFieldValidator,
  RequiredFieldMarker,
  renderLabel,
} from '@/ui/segments/contribute/shared/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IProtocol } from '@/api/entitycore/types/shared/global';
import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';

export function Protocol() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

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
      }),
    [virtualLabId, projectId]
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
            form
          ),
        },
      ]}
    >
      <ProtocolDropdown />
    </Form.Item>
  );
}
