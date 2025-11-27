import { useCallback, useMemo } from 'react';
import { Form } from 'antd';
// import isNil from 'es-toolkit/compat/isNil'; // <--- REMOVED: 'isNil' is defined but never used
import { getProtocols } from '@/api/entitycore/queries/general/protocol';
import { AsyncSelectFormItem } from '@/ui/molecules/async-select';
import {
  CellMorphologySchema,
  label,
  zodFieldValidator,
} from '@/ui/segments/contribute/cell-morphology/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { PaginationFilter, SearchFilter } from '@/api/entitycore/types/shared/request';
import { type IProtocol } from '@/api/entitycore/types/shared/global';

export function Protocol() {
  const form = Form.useFormInstance();
  const { virtualLabId, projectId } = useWorkspace();

  // FIX: Unused 'data' parameter in DataTooltip
  // Renamed 'data' to '_data' to satisfy the rule that unused arguments should start with an underscore.
  // We also explicitly type 'fields' and ensure 'searchable: true' is present from the previous fixes.
  const DataTooltip = useCallback((_data: IProtocol) => {
    const fields: string[] = [];

    if (fields.length === 0) {
      return <div className="text-sm text-gray-500">No additional information</div>;
    }

    return (
      <div className="max-w-xs">
        <div className="space-y-1">
          {fields.map((field, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={`protocol-data-info-${index}`} className="text-sm text-white">
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
        getOptionLabel: (l) => l.generation_type,
        getOptionValue: (l) => l.id,
        placeholder: 'Select a protocol...',
        searchPlaceholder: 'Search protocol...',
        clsx: { trigger: 'rounded-full h-12', content: 'z-[99999]' },
        searchable: true,
        searchField: 'search',
        tooltip: DataTooltip,
      }),
    [virtualLabId, projectId, DataTooltip]
  );

  return (
    <Form.Item
      name="cell_morphology_protocol_id"
      label={label('Protocol', 'main', <sup className="text-destructive">*</sup>)}
      rules={[
        {
          required: true,
          validator: zodFieldValidator(CellMorphologySchema, 'cell_morphology_protocol_id', form),
        },
      ]}
    >
      <ProtocolDropdown />
    </Form.Item>
  );
}
