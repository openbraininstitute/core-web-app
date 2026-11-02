'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { type TViewVariant, ViewVariant } from '@/constants';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import Tab from '@/ui/molecules/tab';

import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';

const SECTION_LABELS: Record<TDetailViewSectionDict, string> = {
  [DetailViewSectionsDict.Overview]: 'Overview',
  [DetailViewSectionsDict.ThreeDView]: '3D view',
  [DetailViewSectionsDict.Results]: 'Results',
  [DetailViewSectionsDict.Analysis]: 'Analysis',
  [DetailViewSectionsDict.RelatedPublications]: 'Related publications',
  [DetailViewSectionsDict.RelatedArtifacts]: 'Related artifacts',
  [DetailViewSectionsDict.Configuration]: 'Configuration',
  [DetailViewSectionsDict.Workflow]: 'Workflow',
};

function useSectionHref() {
  const path = usePathname();
  const query = useSearchParams();
  const parentPath = path.split('/').slice(0, -1).join('/');
  return (s: TDetailViewSectionDict) => `${parentPath}/${s}?${query.toString()}`;
}

export default function DetailMenu({
  sections,
  variant = ViewVariant.Light,
}: {
  sections: TDetailViewSectionDict[];
  variant?: TViewVariant;
}) {
  const page = usePathname().split('/').pop();
  const sectionHref = useSectionHref();

  return sections.map((s) => (
    <Tab key={s} highlight={page === s} href={sectionHref(s)} variant={variant}>
      {SECTION_LABELS[s]}
    </Tab>
  ));
}
