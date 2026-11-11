import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';

export default function CentralLoadingSpinner() {
  return (
    <Spin
      indicator={
        <LoadingOutlined
          style={{
            fontSize: 54,
            display: 'table-cell',
            verticalAlign: 'middle',
          }}
        />
      }
    />
  );
}
