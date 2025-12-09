import { CloseOutlined } from '@ant-design/icons';
import { ConfigProvider, Tag } from 'antd';
import type { CustomTagProps } from 'rc-select/lib/BaseSelect';
import type { DefaultOptionType } from 'antd/es/select';

import { useOptions } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/use-options';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import Search from '@/components/Search';

import type { FacetLabelValuePair } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/use-options';
import type { TCoreFilter } from '@/entity-configuration/definitions/types';

export function SearchFilter({
  data,
  filter,
  values,
  onChange,
}: {
  data: Array<FacetLabelValuePair>;
  filter: TCoreFilter;
  values: string[];
  onChange: (newValues: string[]) => void;
}) {
  const options = useOptions(values, data);

  const handleCheckedChange = (value: string, option: DefaultOptionType) => {
    let newValues = [...values];
    if (values.includes(value)) {
      newValues = values.filter((val) => val !== String(option.label));
    } else {
      newValues.push(String(option.label));
    }
    onChange(newValues);
  };

  const tagRender = (tagProps: CustomTagProps) => {
    const { label, closable, onClose } = tagProps;
    return (
      <ConfigProvider
        theme={{
          token: {
            colorFillQuaternary: '#003A8C',
            colorPrimary: 'white',
            lineHeightSM: 3,
            paddingXXS: 10,
          },
        }}
      >
        <Tag
          className="font-bold"
          closable={closable}
          closeIcon={<CloseOutlined className="text-primary-3" />}
          onClose={onClose}
          style={{ margin: '0.125rem 0.125rem 0.125rem auto' }}
        >
          {label}
        </Tag>
      </ConfigProvider>
    );
  };

  return (
    options &&
    options.length > 0 && (
      <Search
        colorBgContainer="#002766"
        onClear={() => onChange([])}
        handleSelect={handleCheckedChange}
        options={options.map(({ id, label }) => ({
          label,
          value: id,
        }))}
        mode="multiple"
        placeholder={`Search for ${getFieldDefinition(filter.field)?.vocabulary?.plural}`}
        tagRender={(props) => {
          return tagRender(props);
        }}
        value={options.reduce(
          (acc: string[], { checked, label }) => (checked ? [...acc, label] : acc),
          []
        )}
      />
    )
  );
}
