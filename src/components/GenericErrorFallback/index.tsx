'use client';

import { WarningOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import Link from 'next/link';

import { classNames } from '@/util/utils';
interface Props {
  error?: Error & { cause?: unknown };
  cls?: { container: string };
  showButtons?: boolean;
  customError?: string;
  children?: ReactNode;
}

export function ErrorLink({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="w-1/2">
      <div className="hover:bg-opacity-10 hover:text-primary-8 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
        {title}
      </div>
    </Link>
  );
}

export function ErrorComponent({
  error,
  cls = { container: '' },
  customError = '',
  showButtons = true,
  children,
}: Props) {
  return (
    <div
      className={classNames(
        'bg-primary-9 flex h-screen w-full flex-col items-center justify-center p-6 text-white',
        cls.container
      )}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="mb-2 flex items-center justify-start gap-2">
          <WarningOutlined className="text-3xl text-[#f0c75e]" />
          <h1 className="text-4xl font-bold text-[#f0c75e]">An error occurred</h1>
        </div>

        <div className="mb-2 w-full bg-white p-6">
          <h2 className="text-primary-8 mb-2 text-sm font-medium select-none">DESCRIPTION</h2>
          <p className="text-primary-8 text-xl font-bold">
            {(customError ?? error?.message) ||
              'We apologize, but something unexpected went wrong. Please try again later.'}
          </p>
        </div>
        {children}
        {showButtons && (
          <div className="flex w-full gap-2">
            <ErrorLink href="/app/virtual-lab/explore/interactive" title="Back to Explore" />
            <ErrorLink href="/app/virtual-lab" title="Back to Home" />
          </div>
        )}
      </div>
    </div>
  );
}

export function withErrorConfig({
  cls,
  showButtons,
  customError,
  children,
}: {
  cls?: { container: string };
  showButtons?: boolean;
  customError?: string;
  children?: ReactNode;
}) {
  return function ({ error }: { error?: Error & { cause?: unknown } }) {
    return (
      <ErrorComponent error={error} customError={customError} cls={cls} showButtons={showButtons}>
        {children}
      </ErrorComponent>
    );
  };
}

export default ErrorComponent;
