'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { type TViewVariant, ViewVariant } from '@/constants';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import Tab from '@/ui/molecules/tab';

import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';

const SECTION_LABELS: Record<TDetailViewSectionDict, string> = {
  [DetailViewSectionsDict.Overview]: 'Overview',
  [DetailViewSectionsDict.MeshViewer]: 'Mesh viewer',
  [DetailViewSectionsDict.ThreeDView]: '3D view',
  [DetailViewSectionsDict.Results]: 'Results',
  [DetailViewSectionsDict.Analysis]: 'Analysis',
  [DetailViewSectionsDict.RelatedPublications]: 'Related publications',
  [DetailViewSectionsDict.RelatedArtifacts]: 'Related artifacts',
  [DetailViewSectionsDict.Configuration]: 'Configuration',
};

export default function DetailMenu({
  sections,
  variant = ViewVariant.Light,
}: {
  sections: TDetailViewSectionDict[];
  variant?: TViewVariant;
}) {
  const path = usePathname();
  const parentPath = path.split('/').slice(0, -1).join('/');
  const page = path.split('/').pop();
  const query = useSearchParams();

  return sections.map((s) => {
    const url = `${parentPath}/${s}?${query.toString()}`;
    return (
      <Tab key={s} highlight={page === s} href={url} variant={variant}>
        {SECTION_LABELS[s]}
      </Tab>
    );
  });
}
