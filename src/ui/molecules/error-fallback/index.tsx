'use client';

import { RiErrorWarningLine } from '@remixicon/react';
import Link from 'next/link';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

interface Props {
  error?: Error & { cause?: unknown };
  cls?: { container?: string; error?: string };
  showButtons?: boolean;
  customError?: string;
  homeHref?: string;
  homeLabel?: string;
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
  homeHref = '/',
  homeLabel = 'Back to Home',
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
          <RiErrorWarningLine className="size-6 text-warning" />
          <h1 className="text-xl font-bold text-warning">An error occurred</h1>
        </div>

        <div className={cn('text-primary-8 mb-2 w-full bg-white p-6', cls?.error)}>
          <h2 className="mb-2 text-sm font-medium select-none">DESCRIPTION</h2>
          <p className="text-lg font-bold">{error?.message || customError}</p>
        </div>
        {children}
        {showButtons && (
          <div className="flex w-full gap-2">
            <ErrorLink href={homeHref} title={homeLabel} />
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
  homeHref,
  homeLabel,
  children,
}: {
  cls?: { container?: string; error?: string };
  showButtons?: boolean;
  customError?: string;
  homeHref?: string;
  homeLabel?: string;
  children?: ReactNode;
}) {
  return function wrapper({ error }: { error?: unknown }) {
    const resolvedError = error instanceof Error ? error : undefined;
    return (
      <ErrorComponent
        error={resolvedError}
        customError={customError}
        cls={cls}
        showButtons={showButtons}
        homeHref={homeHref}
        homeLabel={homeLabel}
      >
        {children}
      </ErrorComponent>
    );
  };
}

export default ErrorComponent;
