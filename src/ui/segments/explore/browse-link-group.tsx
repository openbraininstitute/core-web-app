'use client';

import { snakeCase } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import { useParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { BrowseLink } from '@/ui/segments/explore/browse-link';

import type { ComponentProps } from 'react';
import type { IListingVariantGroup } from '@/features/views/listing/variants/types';

type TSharedLinkProps = Omit<ComponentProps<typeof BrowseLink>, 'variant' | 'expander'>;

/**
 * A listing's nav row plus its variants (see `features/views/listing/variants`).
 * Collapsed by default and auto-expanded while the listing or one of its sub-items is
 * the current route. Sub-items are mounted only while open, so a collapsed menu fires
 * no extra count requests.
 */
export function BrowseLinkGroup({
  group,
  ...linkProps
}: TSharedLinkProps & { group: IListingVariantGroup }) {
  const { type } = useParams<{ type?: string }>();
  const isGroupActive = type !== undefined && snakeCase(type) === group.dataType;
  const [open, setOpen] = useState(isGroupActive);
  const listId = useId();

  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  return (
    <>
      <BrowseLink
        {...linkProps}
        expander={{
          open,
          onToggle: () => setOpen((value) => !value),
          controlsId: listId,
          label: 'Toggle sub-items', // static: `aria-expanded` already conveys the state
        }}
      />
      {/* unmounted on exit, so a collapsed menu still fires no count requests */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={listId}
            key="sub-items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex w-full flex-col gap-2 overflow-hidden pl-6"
          >
            {group.variants.map((variant) => (
              <li key={variant.slug}>
                <BrowseLink {...linkProps} variant={variant} />
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </>
  );
}
