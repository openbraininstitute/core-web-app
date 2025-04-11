import { Button, Select } from 'antd';
import { PlusCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { UnassignedDimensionBoxProps } from '@/components/explore-section/Simulations/types';

export default function UnassignedDimensionBox({
  dimensionOptions,
  setAxis,
  status,
  setStatus,
}: UnassignedDimensionBoxProps) {
  if (status === 'selection') {
    return (
      <Select
        bordered={false}
        style={{ width: '100%' }}
        className="border-neutral-6 top-1/4 border-b border-solid"
        placeholder="Search dimension..."
        options={dimensionOptions}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        showSearch
        optionFilterProp="label"
        onSelect={setAxis}
        suffixIcon={<SearchOutlined className="text-neutral-6" />}
      />
    );
  }
  return (
    <Button
      className="text-primary-7 top-1/4 m-auto flex items-center"
      type="link"
      icon={<PlusCircleOutlined />}
      onClick={() => setStatus('selection')}
    >
      Assign dimension
    </Button>
  );
}
