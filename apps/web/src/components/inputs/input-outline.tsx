import { Input as AInput, type InputProps } from 'antd';

import { classNames } from '@/util/utils';

function Input({ className, ...props }: InputProps) {
  return (
    <AInput
      size="large"
      className={classNames(
        'rounded-none border-0 border-b border-gray-300 px-1 focus:ring-0',
        'focus:border-primary-8 focus:border-b-2',
        'placeholder:text-gray-400',
        'hover:border-gray-400',
        '[&.ant-input-status-error]:border-b-2! [&.ant-input-status-error]:border-rose-700!',
        '[&.ant-input-status-error]:border-t-0! [&.ant-input-status-error]:border-r-0! [&.ant-input-status-error]:border-l-0!'
      )}
      {...props}
    />
  );
}

export { Input };
