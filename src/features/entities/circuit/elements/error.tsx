import { InfoCircleFilled } from '@ant-design/icons';
import { ReactNode } from 'react';

import { classNames } from '@/util/utils';

export function Error({
  title,
  description,
  icon = <InfoCircleFilled />,
  className,
}: {
  title: string;
  icon?: ReactNode | null;
  description?: string | null;
  className?: string;
}) {
  return (
    <div className={classNames('mb-6 transform rounded-md bg-transparent px-1 py-2', className)}>
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-xl font-bold text-current uppercase">{title}</h2>
          {description && (
            <p className="max-w- text-base font-light text-blue-200/80">{description}</p>
          )}
        </div>
        {icon && <div className="mb-2 flex items-center gap-2 self-baseline">{icon}</div>}
      </div>
    </div>
  );
}
