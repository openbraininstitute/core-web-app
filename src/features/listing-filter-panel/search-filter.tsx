import { CloseOutlined } from '@ant-design/icons';
import { ConfigProvider, Tag } from 'antd';
import type { CustomTagProps } from 'rc-select/lib/BaseSelect';

import { Filter } from '@/features/listing-filter-panel/types';
import { useOptions } from '@/features/listing-filter-panel/use-options';
import { ENTITY_CORE_FIELDS_CONFIG } from '@/constants/explore-section/fields-config';

import Search from '@/components/Search';

export default function SearchFilter({
  data,
  filter,
  values,
  onChange,
}: {
  data: Array<{ label: string; value: number }>;
  filter: Filter;
  values: string[];
  onChange: (newValues: string[]) => void;
}) {
  const options = useOptions(values, data);
  const handleCheckedChange = (value: string) => {
    let newValues = [...values];
    if (values.includes(value)) {
      newValues = values.filter((val) => val !== value);
    } else {
      newValues.push(value);
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
        options={options}
        mode="multiple"
        placeholder={`Search for ${ENTITY_CORE_FIELDS_CONFIG[filter.field].vocabulary.plural}`}
        tagRender={tagRender}
        value={options.reduce(
          (acc: string[], { checked, id }) => (checked ? [...acc, id] : acc),
          []
        )}
      />
    )
  );
}
