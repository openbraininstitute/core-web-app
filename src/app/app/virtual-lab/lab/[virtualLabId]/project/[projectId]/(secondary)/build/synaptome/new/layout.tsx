import type { ReactNode } from 'react';

import { Content, Label, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { resolveProjectUrl, resolveVirtualLabUrl } from '@/utils/url-builder';
import SideMenu from '@/components/SideMenu';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';

type Props = ServerSideComponentProp<WorkspaceContext, { mode: 'clone' | ''; model: string }> & {
  children: ReactNode;
};

export default async function Layout({ params: promisedParams, children }: Props) {
  const { virtualLabId, projectId } = await promisedParams;
  const virtualLabUrl = resolveVirtualLabUrl({ virtualLabId });
  const projectUrl = resolveProjectUrl({
    virtualLabId,
    projectId,
  });

  return (
    <div className="grid h-screen max-h-screen w-full grid-cols-[min-content_auto] overflow-hidden bg-white">
      <SideMenu
        links={[
          {
            key: 'scope',
            href: '#',
            content: 'Synaptome',
            styles: 'text-primary-5 hover:text-primary-5! cursor-default',
          },
          {
            key: LinkItemKey.Build,
            href: `${projectUrl}/build`,
            content: Content.Build,
            styles: 'rounded-full bg-primary-5 py-3 text-primary-9 w-2/3',
          },
        ]}
        lab={{
          key: LinkItemKey.VirtualLab,
          id: virtualLabId,
          label: Label.VirtualLab,
          href: `${virtualLabUrl}/overview`,
        }}
        project={{
          key: LinkItemKey.Project,
          id: projectId,
          virtualLabId,
          label: Label.Project,
          href: `${projectUrl}/home`,
        }}
      />
      <div>{children}</div>
    </div>
  );
}
