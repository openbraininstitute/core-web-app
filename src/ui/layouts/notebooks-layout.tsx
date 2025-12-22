'use client';

import { LoadingOutlined } from '@ant-design/icons';
import Image from 'next/image';
import NextLink from 'next/link';
import { type ReactNode, useState } from 'react';
import { useAppNotification } from '@/components/notification';
import { startEmptyNotebook } from '@/services/notebooks';
import { cn } from '@/utils/css-class';
import { useWorkspace } from '../hooks/use-workspace';

type Props = {
  children: ReactNode;
  active: 'public' | 'private';
};

export function NotebooksLayout({ children, active }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const [loading, setLoading] = useState(false);

  async function handleRunNotebook() {
    setLoading(true);
    try {
      const retval = await startEmptyNotebook(virtualLabId, projectId);
      notification.success({
        message: `Notebook starting`,
        key: 'notebook-started-successfully',
        placement: 'topRight',
      });
      window.open(retval.url, '_blank');
    } catch (error) {
      // Just show the hint message if we get some error
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook, unknown error: ${error}`,
          key: 'notebook-unknown-error',
          placement: 'topRight',
        });
      }
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <div className="mb-5 ml-5 flex justify-between">
        <div className="flex">
          <NextLink
            href="public"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-l-full px-4 py-2 text-white',
              active === 'public' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Public
          </NextLink>

          <NextLink
            href="private"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-r-full px-4 py-2 text-white',
              active === 'private' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Project
          </NextLink>
        </div>
        <button
          disabled={loading}
          type="button"
          className="flex h-[40px] items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-5 text-[#F37726]"
          onClick={handleRunNotebook}
        >
          <div>Open JupyterHub</div>
          {!loading && <Image src="/images/jupyter.svg" alt="Jupyter hub" width={20} height={20} />}
          {loading && <LoadingOutlined className="text-[#F37726]" />}
        </button>
      </div>

      <div
        id="notebooks-layout"
        className="bg-background border-neutral-2 ml-5 h-[calc(100vh-11rem)] rounded-2xl border p-5"
      >
        {children}
      </div>
    </div>
  );
}
