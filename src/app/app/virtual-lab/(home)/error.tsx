'use client';

import { Button } from 'antd';
import { WarningOutlined, ReloadOutlined, MailOutlined } from '@ant-design/icons';

export default function ErrorComponent({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-primary-9 p-6 text-white">
      <div className="w-full max-w-2xl overflow-hidden rounded-none border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-red-100 bg-red-50 p-4">
          <div className="flex items-center gap-3 text-red-700">
            <WarningOutlined className="text-2xl" />
            <h1 className="text-xl font-semibold">Error</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-bold text-gray-800">Something went wrong</h2>
            <p className="text-gray-600">
              We encountered an unexpected error while processing your request. This could be due to
              a temporary issue or a problem with your connection.
            </p>
          </div>

          {error?.message && (
            <div className="mb-6 rounded-none border border-gray-200 bg-gray-50 p-4">
              <div className="mb-1 text-sm text-gray-500">ERROR DETAILS</div>
              <div className="break-words font-mono text-sm text-gray-700">{error.message}</div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-primary-8">
                    View stack trace
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs text-gray-600">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="mb-6 border-l-4 border-amber-400 bg-amber-50 p-4">
            <h3 className="mb-1 text-sm font-semibold text-amber-800">Need help?</h3>
            <p className="text-sm text-amber-700">
              If this error persists, please contact our support team at{' '}
              <a
                href="mailto:support@openbraininstitute.org"
                className="font-medium text-primary-8 hover:underline"
              >
                support@openbraininstitute.org
              </a>{' '}
              with the error details above.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-4">
            <a
              href="mailto:support@openbraininstitute.org"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-8"
            >
              <MailOutlined /> Contact Support
            </a>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={resetErrorBoundary}
              className="flex h-10 items-center gap-2 rounded-none bg-primary-8"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
