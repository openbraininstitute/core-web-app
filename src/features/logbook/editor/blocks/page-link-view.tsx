import { NodeViewWrapper } from '@tiptap/react';
import { isNil } from 'es-toolkit';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import { PageKind } from '@/api/logbook/types';
import { usePages } from '@/features/logbook/api/pages';
import { useLogContext } from '@/features/logbook/log/context';
import { navigate, pathOf } from '@/features/logbook/router';
import { Icon } from '@/ui/molecules/icon';

import type { NodeViewProps } from '@tiptap/react';

const CHIP =
  'mx-px inline-flex max-w-full items-baseline gap-1 rounded-md border-0 bg-primary-0 px-1.5 py-px align-baseline text-[0.94em] leading-[1.35] font-semibold text-primary-8 transition-colors duration-150 hover:bg-primary-1 focus-visible:outline-2 focus-visible:outline-primary-4 disabled:cursor-default disabled:bg-fill-2 disabled:text-neutral-4 data-[gone=true]:line-through data-[selected=true]:ring-2 data-[selected=true]:ring-primary-4';

/** A link to a page of this log, named by the page as it is now; a click opens the page. */
export function PageLinkView({ node, selected }: NodeViewProps) {
  const { project, logId } = useLogContext();
  // The list the outline already holds: a link asks the server nothing.
  const pages = usePages(logId, project);
  const pageId = String(node.attrs['pageId']);
  const label = String(node.attrs['label']);
  const page = pages.data?.find((item) => item.id === pageId);
  const missing = pages.isSuccess && isNil(page);
  // A page someone made a moment ago is not in this list yet: the list is asked again once, and
  // only a list read after this link appeared can say the page is gone.
  const [shownAt] = useState(Date.now);
  const checked = pages.dataUpdatedAt >= shownAt;
  const { refetch } = pages;
  useEffect(() => {
    // `cancelRefetch: false`: many links missing at once share one request.
    if (missing && !checked) void refetch({ cancelRefetch: false });
  }, [missing, checked, refetch]);
  const gone = missing && checked;
  const title = page?.title ?? label;
  return (
    <NodeViewWrapper as="span" className="inline">
      {/* A button: the keyboard reaches it, and the editor leaves the click to it. */}
      <button
        type="button"
        className={CHIP}
        data-selected={selected}
        data-gone={gone}
        disabled={missing}
        title={match({ gone, missing })
          .with({ gone: true }, () => `${label}: this page was deleted`)
          .with({ missing: true }, () => `Looking for ${label}…`)
          .otherwise(() => `Open ${title}`)}
        onClick={() => {
          if (isNil(page)) return;
          navigate(pathOf(project, logId, page.kind === PageKind.Main ? null : page.id));
        }}
      >
        <span className="flex flex-none self-center">
          <Icon name={page?.kind === PageKind.Main ? 'home' : 'page'} size={12} />
        </span>
        <span className="min-w-0 truncate">{title}</span>
      </button>
    </NodeViewWrapper>
  );
}
