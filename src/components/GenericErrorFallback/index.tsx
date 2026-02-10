'use client';

import { WarningOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import Link from 'next/link';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

interface Props {
  error?: Error & { cause?: unknown };
  cls?: { container?: string; error?: string };
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
  cls,
  customError = '',
  showButtons = true,
  children,
}: Props) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center bg-white p-6 text-white',
        cls?.container
      )}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="mb-2 flex items-center justify-start gap-2">
          <WarningOutlined className="text-2xl text-[#f0c75e]" />
          <h1 className="text-xl font-bold text-[#f0c75e]">An error occurred</h1>
        </div>

        <div className={cn('text-primary-8 mb-2 w-full bg-white p-6', cls?.error)}>
          <h2 className="mb-2 text-sm font-medium select-none">DESCRIPTION</h2>
          <p className="text-lg font-bold">{error?.message || customError}</p>
        </div>
        {children}
        {showButtons && (
          <div className="flex w-full gap-2">
            <ErrorLink href="/app/virtual-lab/sync" title="Back to Home" />
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
  cls?: { container?: string; error?: string };
  showButtons?: boolean;
  customError?: string;
  children?: ReactNode;
}) {
  return function wrapper({ error }: { error?: Error & { cause?: unknown } }) {
    return (
      <ErrorComponent error={error} customError={customError} cls={cls} showButtons={showButtons}>
        {children}
      </ErrorComponent>
    );
  };
}

export default ErrorComponent;
