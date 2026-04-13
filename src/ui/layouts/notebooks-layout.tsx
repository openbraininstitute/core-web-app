'use client';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import NextLink from 'next/link';
import { type ReactNode, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { startEmptyNotebook } from '@/services/notebooks';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { ContributionModal } from '@/ui/segments/contribute/modal';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
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
  const breakpoint = useDefaultBreakpoint();

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: Boolean(virtualLabId),
  });

  const handleUploadData = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: ExtendedEntitiesTypeDict.Notebook,
      sessionId: crypto.randomUUID(),
    });
  };

  async function handleRunNotebook() {
    setLoading(true);
    if (virtualLabData == null || virtualLabData.data == null) {
      setLoading(false);
      throw new Error(`Could not fetch virtual lab data`);
    }
    try {
      const retval = await startEmptyNotebook(
        virtualLabId,
        projectId,
        virtualLabData.data.virtual_lab.compute_cell
      );
      notification.success({
        message: `Notebook starting`,
        key: 'notebook-started-successfully',
        placement: 'topRight',
      });
      window.open(retval.url, '_blank');
    } catch (error) {
      if (error instanceof Error && 'cause' in error) {
        notification.error({
          message: (error.cause as { error_code: string; hint: string }).hint,
          key: 'notebook-error',
          placement: 'topRight',
        });
      } else {
        notification.error({
          message: `Failed to start notebook`,
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
      <div className="mb-5 ml-5 flex items-center justify-between">
        <div className="flex">
          <NextLink
            href="public"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-l-full px-4 py-2',
              active === 'public' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Public
          </NextLink>

          <NextLink
            href="private"
            className={cn(
              'flex h-[40px] min-w-[150px] items-center justify-center rounded-r-full px-4 py-2',
              active === 'private' ? 'bg-primary-9 font-bold text-white' : 'text-primary-9 bg-white'
            )}
          >
            Project
          </NextLink>
        </div>

        <div className="flex items-center gap-4">
          {active === 'private' && (
            <Button
              rounded
              variant="success"
              size={breakpoint === 'xl' ? 'lg' : 'md'}
              type="button"
              onClick={handleUploadData}
              className={cn(
                'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
                'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
                'transition-all duration-300 ease-out',
                'hover:scale-[1.02] active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-70'
              )}
            >
              <div className="flex items-center justify-between gap-5">
                <span>Upload notebook</span>
                <PlusOutlined className="ml-auto text-sm" />
              </div>
            </Button>
          )}

          <button
            disabled={loading}
            type="button"
            className="flex h-[40px] items-center justify-between gap-2 rounded-full border border-[#F37726] bg-white px-5 text-[#F37726] transition-colors hover:bg-orange-50"
            onClick={handleRunNotebook}
          >
            <div>Open JupyterHub</div>
            {!loading && (
              <Image src="/images/jupyter.svg" alt="Jupyter hub" width={20} height={20} />
            )}
            {loading && <LoadingOutlined className="text-[#F37726]" />}
          </button>
        </div>
      </div>

      <div
        id="notebooks-layout"
        className="bg-background border-neutral-2 ml-5 h-[calc(100vh-11rem)] rounded-2xl border p-5"
      >
        {children}
      </div>

      <ContributionModal />
    </div>
  );
}
