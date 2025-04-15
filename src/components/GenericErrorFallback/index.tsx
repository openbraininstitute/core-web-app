'use client';

import { WarningOutlined } from '@ant-design/icons';
import Link from 'next/link';

import { classNames } from '@/util/utils';
interface ErrorComponentProps {
  error: Error & { cause?: unknown };
  cls?: { container: string };
  showButtons?: boolean;
  customError?: string;
}

export function ErrorComponent({
  error,
  cls = { container: '' },
  customError = '',
  showButtons = true,
}: ErrorComponentProps) {
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

        {showButtons && (
          <div className="flex w-full gap-2">
            <Link href="/app/virtual-lab/explore/interactive" className="w-1/2">
              <div className="hover:bg-opacity-10 hover:text-primary-8 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
                Back to Explore
              </div>
            </Link>
            <Link href="/app/virtual-lab" className="w-1/2">
              <div className="hover:bg-opacity-10 hover:text-primary-8 border border-white py-4 text-center text-base font-medium text-white transition-colors hover:bg-white">
                Back to home
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Higher Order Component
export function withErrorConfig({
  cls,
  showButtons,
  customError,
}: {
  cls?: { container: string };
  showButtons?: boolean;
  customError?: string;
}) {
  return function ({ error }: { error: Error & { cause?: unknown } }) {
    return (
      <ErrorComponent error={error} customError={customError} cls={cls} showButtons={showButtons} />
    );
  };
}

// Default export with original behavior
export default ErrorComponent;
