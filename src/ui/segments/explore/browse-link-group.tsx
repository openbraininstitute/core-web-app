'use client';

import { snakeCase } from 'es-toolkit/compat';
import { useParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { BrowseLink } from '@/ui/segments/explore/browse-link';

import type { ComponentProps } from 'react';
import type { IListingSplit } from '@/features/views/listing/splits/types';

type TSharedLinkProps = Omit<ComponentProps<typeof BrowseLink>, 'splitOption' | 'expander'>;

/**
 * A listing's nav row plus its split sub-items (see `features/views/listing/splits`).
 * Collapsed by default and auto-expanded while the listing or one of its sub-items is
 * the current route. Sub-items are mounted only while open, so a collapsed menu fires
 * no extra count requests.
 */
export function BrowseLinkGroup({
  split,
  ...linkProps
}: TSharedLinkProps & { split: IListingSplit }) {
  const { type } = useParams<{ type?: string }>();
  const isGroupActive = type !== undefined && snakeCase(type) === split.dataType;
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
      {open && (
        <ul id={listId} className="flex w-full flex-col gap-2 pl-6">
          {split.options.map((option) => (
            <li key={option.slug}>
              <BrowseLink {...linkProps} splitOption={option} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
