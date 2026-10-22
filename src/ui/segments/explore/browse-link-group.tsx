'use client';

import { snakeCase } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';

import { BrowseLink } from '@/ui/segments/explore/browse-link';
import { getEntityTypeFromUrlOnEntityScope } from '@/ui/segments/explore/helpers';

import type { ComponentProps } from 'react';
import type { IListingVariantGroup } from '@/features/views/listing/variants/types';

type TSharedLinkProps = Omit<ComponentProps<typeof BrowseLink>, 'variant' | 'onClick'>;

/**
 * A listing's nav row plus its variants (see `features/views/listing/variants`).
 * Expanded while the listing or one of its sub-items is the current route. Clicking the row
 * expands it immediately, before navigation resolves, then the route keeps it open.
 * Sub-items are mounted only while open, so a collapsed menu fires no extra count requests.
 */
export function BrowseLinkGroup({
  group,
  ...linkProps
}: TSharedLinkProps & { group: IListingVariantGroup }) {
  const pathname = usePathname();
  const { type } = useParams<{ type?: string }>();
  // the listing itself is a static route (`browse/entity/circuit`) with no `type` param
  const routeType = type ?? getEntityTypeFromUrlOnEntityScope(pathname);
  const isGroupActive = !!routeType && snakeCase(routeType) === group.dataType;
  // the optimistic open lasts only while still on the page it was clicked from;
  // once the route changes, the route decides
  const [clickedFrom, setClickedFrom] = useState<string | null>(null);
  const open = isGroupActive || clickedFrom === pathname;

  return (
    <>
      <BrowseLink {...linkProps} onClick={() => setClickedFrom(pathname)} />
      {/* unmounted on exit, so a collapsed menu still fires no count requests */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            key="sub-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            // -mt-2/pt-2 cancels the parent's gap-2 so the first connector can reach up past
            // the ul's overflow clip toward the parent row without shifting the layout
            className="-mt-2 flex w-full flex-col gap-2 overflow-hidden pt-2 pl-8"
          >
            {group.variants.map((variant) => (
              <li key={variant.slug} className="group/sub relative">
                {/* tree connector: one continuous trunk (a segment per row, overlapping 1px so
                    there is no seam) with a curve-only elbow branching into each row's center;
                    the last segment stops where its elbow starts curving */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-[9px] -bottom-[9px] -left-5 w-px bg-gray-200 group-last/sub:bottom-[calc(50%+0.75rem)]"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-[calc(50%-0.75rem)] -left-5 h-3 w-4 rounded-bl-xl border-b border-l border-gray-200"
                />
                <BrowseLink {...linkProps} variant={variant} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}
