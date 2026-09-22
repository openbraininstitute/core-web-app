import { CloseCircleFilled } from '@ant-design/icons';

import { classNames } from '@/util/utils';

import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  borderless?: boolean;
  cls?: {
    container?: string;
    title?: string;
    description?: string;
  };
};
export function ErrorData({ title, description, cls, borderless = false }: Props) {
  return (
    <div
      data-testid="virtual-labs-memberships-empty"
      className={classNames(
        'bg-primary-9 mx-auto mb-6 w-full max-w-7xl rounded-sm border-white p-6 text-white hover:shadow-sm',
        cls?.container,
        borderless ? 'border-none' : 'border'
      )}
    >
      <div className="flex flex-col items-start justify-between gap-1">
        <h2 className={classNames('text-2xl font-bold', cls?.title)}>
          <CloseCircleFilled className="mr-2" />
          {title}
        </h2>
        {description && (
          <p className={classNames('ml-8 max-w-[70%]', cls?.description)}>{description}</p>
        )}
      </div>
    </div>
  );
}

export default ErrorData;
