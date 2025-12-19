import { RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

export default function Breadcrumb({
  children,
  showChevron = true,
}: {
  children?: ReactNode;
  showChevron?: boolean;
}) {
  return (
    <div className="align-center inline-flex justify-center gap-4">
      <span className="text-primary-8">{children}</span>
      {showChevron && (
        <div className="text-gray-500">
          <RightOutlined className="text-sm" />
        </div>
      )}
    </div>
  );
}
