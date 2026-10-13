'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
 * Whether the current section renders full-page: an e-model's Configuration section is the
 * optimisation scan config, which replaces the sidebar and moves section switching to a dropdown
 * in the breadcrumb row. The server decides `configurationFullPage` per entity (e-models with a
 * hard-coded mechanisms file keep the classic view).
 */
export function useFullPageSection(configurationFullPage: boolean) {
  const page = usePathname().split('/').pop();
  return configurationFullPage && page === DetailViewSectionsDict.Configuration;
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
        <DropdownMenuContent
          align="start"
          className="z-9999 min-w-40 rounded-xl border-neutral-1 bg-white p-1 shadow-md"
        >
          {sections
            .filter((s) => s !== page)
            .map((s) => (
              <DropdownMenuItem key={s} onSelect={() => router.push(sectionHref(s))}>
                {SECTION_LABELS[s]}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
