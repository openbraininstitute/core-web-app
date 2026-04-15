'use client';

import { CloseOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { config } from '@/config';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { SharedLayout } from '@/ui/layouts/shared-layout';
import { Button } from '@/ui/molecules/button';
import { CodeBlock, CodeBlockCopyButton, CodeBlockLanguageLabel } from '@/ui/molecules/code-blocks';
import { cn } from '@/utils/css-class';

import type { ErrorComponentProps } from '@/types/common';

export default function ErrorPage({ error }: ErrorComponentProps) {
  const breakpoint = useDefaultBreakpoint();
  const { back } = useRouter();
  const [isDebugInfoVisible, setIsDebugInfoVisible] = useState(true);
  return (
    <SharedLayout>
      <div className="flex  flex-col items-center justify-center gap-6 mx-auto " id="error-page">
        <div className="flex max-w-lg mx-auto w-full flex-col items-center justify-center">
          <h1 className="text-primary-9 text-5xl font-bold">Error</h1>
          <p className="text-primary-8 my-4 rounded-xl border border-gray-200 p-5 text-xl font-light select-none">
            {error.message}
          </p>
        </div>
        <div className="flex max-w-lg mx-auto items-center justify-center gap-2.5 w-full">
          <Button
            rounded
            onClick={back}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            type="submit"
            className="disabled:bg-neutral-1 disabled:text-neutral-4!  px-8! py-6! font-bold hover:text-primary-8"
          >
            Go back
          </Button>
          <Button
            rounded
            asChild
            variant="default"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
            type="submit"
            className="disabled:bg-neutral-1 disabled:text-neutral-4!  px-8! py-6! font-bold hover:text-white"
          >
            <Link href="/app/virtual-lab/sync" className="flex items-center justify-center gap-3.5">
              <span>Go to project</span>
            </Link>
          </Button>
        </div>
      </div>
      {config.DEPLOYMENT_ENV !== 'production' && isDebugInfoVisible && (
        <div className="max-w-4xl w-full mx-auto flex flex-col mt-10">
          <div className="bg-gray-50 py-3 rounded-2xl flex items-start justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-lg text-red-400 font-semibold">
                This information is for diagnostic purposes only, and is not available in the
                production environment.
              </p>
              <small className="text-gray-400">
                Close this section to hide the debug information.
              </small>
            </div>
            <button
              type="button"
              className={cn(
                'text-gray-500 hover:text-gray-400 hover:bg-gray-100 rounded-full p-2 size-8',
                'flex items-center justify-center'
              )}
              onClick={() => setIsDebugInfoVisible(false)}
              aria-label="Close debug information"
            >
              <CloseOutlined className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2.5 bg-gray-100 rounded-2xl px-4 py-6">
            <p className="text-lg text-destructive select-none font-bold rounded-full px-4 py-2 bg-gray-200/70 w-max">
              Debug Information
            </p>
            <p className="text-base text-gray-400">error message: {error.message}</p>
            {'cause' in error && (
              <CodeBlock
                code={JSON.stringify(error.cause, null, 2)}
                language="json"
                showLineNumbers
                className="max-h-96 h-full overflow-auto secondary-scrollbar relative self-start"
              >
                <div className="bg-neutral-light z-10 flex items-center justify-between px-2 py-2 sticky top-0">
                  <CodeBlockLanguageLabel />
                  <CodeBlockCopyButton
                    onCopy={() => {
                      navigator.clipboard.writeText(JSON.stringify(error.cause, null, 2));
                    }}
                    className="ml-auto size-8 self-end rounded-full px-2 hover:bg-gray-300"
                    iconClassName="text-gray-500 size-4"
                  />
                </div>
              </CodeBlock>
            )}
          </div>
        </div>
      )}
    </SharedLayout>
  );
}
