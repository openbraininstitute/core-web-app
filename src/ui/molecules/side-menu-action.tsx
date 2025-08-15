import { ReactNode } from 'react';
import { AntdIconProps } from '@ant-design/icons/lib/components/AntdIcon';

export default function Action({
  children,
  Icon
}: {
  children: ReactNode;
  Icon: React.ComponentType<AntdIconProps>;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>{children}</div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-400">
        <Icon className="text-[12px]" />
      </div>
    </div>
  );
}
