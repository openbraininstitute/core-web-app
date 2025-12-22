import { LoadingOutlined } from '@ant-design/icons';
import Spin, { SpinIndicator } from 'antd/es/spin';

export function Loader({
  size = 'large',
  icon = <LoadingOutlined />,
  className = 'text-neutral-3 absolute top-1/2 left-1/2',
}: {
  size?: React.ComponentProps<typeof Spin>['size'];
  icon?: SpinIndicator;
  className?: string;
}) {
  return <Spin size={size} indicator={icon} className={className} />;
}

export default Loader;
