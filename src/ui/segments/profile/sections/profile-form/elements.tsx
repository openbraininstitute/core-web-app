import { CloseCircleFilled } from '@ant-design/icons';
import { Select as ASelect, Input, type InputProps, type InputRef, type SelectProps } from 'antd';

import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { ForwardedRef, ReactNode } from 'react';

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

export function Select({ options, value, onChange, className, ...props }: SelectProps) {
  return (
    <ASelect
      className={cn(
        'border-primary-8 min-w-36 border-0 border-b ring-0 focus:border-b-2! [&.ant-select-focused]:border-b-2',
        'shadow-none ring-0 [&.ant-select-focused_.ant-select-selector]:ring-0!',
        '[&_.ant-select-selector]:border-0! focus:[&_.ant-select-selector]:ring-0!',
        'placeholder:text-gray-400 hover:border-gray-400',
        className
      )}
      classNames={{ popup: { root: 'rounded-none shadow-md' } }}
      placeholder="select virtual lab"
      options={options}
      value={value}
      onChange={onChange}
      {...props}
    />
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
        'border-transparent! rounded-none border-0 border-b border-b-primary-4! rounded-b-none! bg-transparent! px-1 font-bold tracking-wide text-white! focus:ring-0',
        'hover:bg-transparent! hover:text-white! focus:bg-transparent! focus:text-white! [&_.ant-input-outlined]:bg-transparent!',
        'focus:border-pr placeholder:text-white! hover:border-white focus:border-b-2',
        'focus-within:border-b-2! focus-within:ring-0!',
        '[&.ant-XInput-status-error]:border-0! [&.ant-XInput-status-error]:border-b-2! [&.ant-XInput-status-error]:border-red-300!',
        '[&.ant-input-status-error]:border-0! [&.ant-input-status-error]:border-b-2! [&.ant-input-status-error]:border-red-500!',
        className
      )}
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

export function GitHubIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="white">
      <title>GitHub</title>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
      <title>Google</title>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function EntraIdIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width="16" height="16">
      <title>Microsoft Entra ID</title>
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#00a4ef" d="M1 12h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}
