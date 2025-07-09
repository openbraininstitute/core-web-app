import { ErrorBoundary } from 'react-error-boundary';
import { useAtomValue } from 'jotai';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideMenu from '@/components/SideMenu';
import { Label, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { selectedSimulationScopeAtom } from '@/state/simulate';
import { LinkItem } from '@/components/VerticalLinks';

type Props = {
  params: {
    virtualLabId: string;
    projectId: string;
  };
  extraLinks?: LinkItem[];
};

export default function Nav({ params, extraLinks }: Props) {
  const labUrl = generateLabUrl(params.virtualLabId);

  const labProjectUrl = `${labUrl}/project/${params.projectId}`;
  const scope = useAtomValue(selectedSimulationScopeAtom);

  const links: LinkItem[] = [
    {
      key: LinkItemKey.Build,
      href: `${labProjectUrl}/build`,
      content: 'Build',
      styles:
        'rounded-full bg-primary-5 py-1 px-1 text-primary-9 w-[21px] font-semibold capitalize',
    },
  ];

  if (scope)
    links.unshift({
      key: LinkItemKey.Build,
      href: `${labProjectUrl}/build?s=new&t=${scope}`,
      content: <>{scope.replace('-', ' ')}</>,
      styles: 'text-primary-5 hover:text-primary-2! cursor-pointer',
    });

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <SideMenu
        links={extraLinks ?? links}
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
    </ErrorBoundary>
  );
}
