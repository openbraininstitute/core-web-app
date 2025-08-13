'use client';

import { ReactNode } from 'react';
import NextLink from 'next/link';
import { useParams } from 'next/navigation';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import { basePath } from '@/config';
import useWorkspace from '@/ui/hooks/use-workspace';

export default function Layout({ children }: { children: ReactNode }) {
  const { virtualLabId, projectId } = useWorkspace();
  const { type } = useParams();

  return (
    <div className="ml-5 flex h-full rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">
      <div className="flex basis-1/5">
        <div className="flex flex-wrap gap-3">
          <Breadcrumb>
            <NextLink href={`${basePath}/app/v2/${virtualLabId}/${projectId}/explore`}>
              Explore
            </NextLink>
          </Breadcrumb>
          <Breadcrumb>
            <NextLink
              href={`${basePath}/app/v2/${virtualLabId}/${projectId}/explore/browse/${type}`}
            >
              {type}
            </NextLink>
          </Breadcrumb>
          <Breadcrumb showChevron={false}>One</Breadcrumb>
        </div>
      </div>
      <div className="grow basis-4/5">{children}</div>
    </div>
  );
}
