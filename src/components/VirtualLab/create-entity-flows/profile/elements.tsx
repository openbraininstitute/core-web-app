import { CloseCircleFilled } from '@ant-design/icons';
import { Input, type InputProps, type InputRef } from 'antd';
import type { ForwardedRef, ReactNode } from 'react';

import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

export function ProfileError() {
  return (
    <div className="mb-6 transform rounded-xs bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-red-200">Profile error</h2>
          <p className="max-w-xl text-red-200/80">
            We were unable to fetch your profile information from our servers. Please refresh the
            page or try again later. if the issue persists, please contact support at{' '}
            <a href="mailto:support@openbraininstitute.org">support@openbraininstitute.org</a>.
          </p>
        </div>
        <div className="mb-2 flex items-center gap-2 self-baseline">
          <CloseCircleFilled className="text-2xl text-red-500" />
        </div>
      </div>
    </div>
  );
}

export function XInput({
  placeholder,
  className,
  ref,
  ...props
}: InputProps & { ref?: ForwardedRef<InputRef> }) {
  return (
    <Input
      ref={ref}
      placeholder={placeholder}
      className={classNames(
        'border-primary-4! rounded-none border-0 border-b bg-transparent! px-1 font-bold tracking-wide text-white focus:ring-0',
        'hover:bg-transparent! hover:text-white! focus:bg-transparent! focus:text-white! [&_.ant-input-outlined]:bg-transparent!',
        'focus:border-pr placeholder:text-white hover:border-white focus:border-b-2',
        'focus-within:border-primary-4! focus-within:border-b-2! focus-within:ring-0!',
        '[&.ant-XInput-status-error]:border-0! [&.ant-XInput-status-error]:border-b-2! [&.ant-XInput-status-error]:border-red-300!',
        '[&.ant-input-status-error]:border-0! [&.ant-input-status-error]:border-b! [&.ant-input-status-error]:border-red-500!',
        className
      )}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

export function Label({ title }: { title: string }) {
  return <span className="text-primary-4 text-sm font-light">{title}</span>;
}

export const label = (text: string, extra?: ReactNode) => (
  <span className={cn('text-primary-4 text-sm font-light')}>
    {text} {extra}
  </span>
);
