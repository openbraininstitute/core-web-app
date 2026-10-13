'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TViewVariant, ViewVariant } from '@/constants';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import Breadcrumb, { ToneDict } from '@/ui/molecules/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import Tab from '@/ui/molecules/tab';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';

const SECTION_LABELS: Record<TDetailViewSectionDict, string> = {
  [DetailViewSectionsDict.Overview]: 'Overview',
  [DetailViewSectionsDict.ThreeDView]: '3D view',
  [DetailViewSectionsDict.Results]: 'Results',
  [DetailViewSectionsDict.Analysis]: 'Analysis',
  [DetailViewSectionsDict.RelatedPublications]: 'Related publications',
  [DetailViewSectionsDict.RelatedArtifacts]: 'Related artifacts',
  [DetailViewSectionsDict.Configuration]: 'Configuration',
};

/**
 * The e-model Configuration section is the optimisation scan config, a full-page UI: it replaces
 * the sidebar, and section switching moves to a dropdown in the breadcrumb row.
 */
export function useFullPageSection(type: TExtendedEntitiesTypeDict) {
  const page = usePathname().split('/').pop();
  return type === ExtendedEntitiesTypeDict.Emodel && page === DetailViewSectionsDict.Configuration;
}

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

/** `> [Configuration ▾]`: the current section as a dropdown that routes to any sibling section. */
export function SectionSelector({ sections }: { sections: TDetailViewSectionDict[] }) {
  const router = useRouter();
  const page = usePathname().split('/').pop() as TDetailViewSectionDict;
  const sectionHref = useSectionHref();

  return (
    <div className="flex flex-nowrap items-center gap-3">
      {/* chevron that joins the breadcrumb trail to the selector */}
      <Breadcrumb variant={ViewVariant.Light} tone={ToneDict.Inactive} />
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="detail-section-selector"
          className="inline-flex items-center gap-1 rounded-md border border-primary-9 px-3 py-1 font-bold text-primary-9 outline-hidden"
        >
          {SECTION_LABELS[page]}
          <RiArrowDownSLine className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {sections.map((s) => (
            <DropdownMenuItem key={s} onSelect={() => router.push(sectionHref(s))}>
              {SECTION_LABELS[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
