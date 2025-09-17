'use client';

import { ReactNode, use } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSelectedLayoutSegments } from 'next/navigation';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideMenu from '@/components/SideMenu';

import { LinkItemKey, Content, Label } from '@/constants/virtual-labs/sidemenu';
import { generateLabUrl } from '@/util/virtual-lab/urls';

type Props = {
  children: ReactNode;
  params: Promise<{
    virtualLabId: string;
    projectId: string;
  }>;
};

export default function SimulateSingleNeuronEditLayout({
  params: promisedParams,
  children,
}: Props) {
  const params = use(promisedParams);
  const segments = useSelectedLayoutSegments();

  const labUrl = generateLabUrl(params.virtualLabId);

  const labProjectUrl = `${labUrl}/project/${params.projectId}`;
  let currentSegment = segments.at(0);

  // TODO: this should change in me-model configuration
  // NOTE: this change will impact other pages/links
  if (currentSegment === 'me-model') currentSegment = 'single-neuron';

  return (
    <div className="grid h-screen grid-cols-[max-content_auto] grid-rows-1 bg-white">
      <SideMenu
        links={[
          {
            key: 'scope',
            href: `${labProjectUrl}/simulate?s=new&t=${currentSegment}`,
            content: <>{currentSegment?.replace('-', ' ')}</>,
            styles: 'text-primary-5 hover:text-primary-2! cursor-pointer',
          },
          {
            key: LinkItemKey.Simulate,
            href: `${labProjectUrl}/simulate`,
            content: Content.Simulate,
            styles:
              'rounded-full bg-primary-5 py-1 px-1 text-primary-9 w-[26px] font-semibold capitalize',
          },
        ]}
        lab={{
          key: LinkItemKey.VirtualLab,
          id: params.virtualLabId,
          label: Label.VirtualLab,
          href: `${labUrl}/overview`,
        }}
        project={{
          key: LinkItemKey.Project,
          id: params.projectId,
          virtualLabId: params.virtualLabId,
          label: Label.Project,
          href: `${labProjectUrl}/home`,
        }}
      />
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>{children}</ErrorBoundary>
    </div>
  );
}
