import { ExclamationCircleFilled } from '@ant-design/icons';
import { ReactNode } from 'react';

import { classNames } from '@/util/utils';

export default function EmptyData({
  title,
  description,
  cls,
}: {
  title: ReactNode;
  description?: ReactNode;
  cls?: {
    container?: string;
  };
}) {
  return (
    <div
      data-testid="virtual-labs-memberships-empty"
      className={classNames(
        'bg-primary-9 mx-auto mb-6 w-full max-w-7xl rounded-sm border border-white p-6 hover:shadow-sm',
        cls?.container
      )}
    >
      <div className="flex flex-col items-start justify-between gap-1">
        <h2 className="text-2xl font-bold text-white">
          <ExclamationCircleFilled className="mr-2 text-white" />
          {title}
        </h2>
        {description && <p className="ml-8 max-w-[70%] text-white">{description}</p>}
      </div>
    </div>
  );
}
