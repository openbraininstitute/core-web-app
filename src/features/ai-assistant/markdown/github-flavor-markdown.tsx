import { math } from '@streamdown/math';
import Link from 'next/link';
import React, { type AnchorHTMLAttributes, useMemo } from 'react';
import { Streamdown } from 'streamdown';
import 'katex/dist/katex.min.css';
import 'streamdown/styles.css';

import { classNames } from '@/util/utils';

import { Highlighter } from './highlighter/highlighter';
import { MarkdownTable, MarkdownTd } from './markdown-table/markdown-table';
import StorageImage from './storage-image/storage-image';

import styles from './github-flavor-markdown.module.css';

// Module-level constants — stable references, zero re-render cost
const STREAMDOWN_PLUGINS = { math };

// Animation config: short fadeIn tuned for the backend's ~10ms word-level stream.
// stagger: 0 disables inter-word delay since the backend IS the stagger.
const STREAMDOWN_ANIMATION = {
  animation: 'fadeIn' as const,
  duration: 150,
  easing: 'ease-out',
  stagger: 0,
};

function ParagraphDiv({ children }: { children?: React.ReactNode }) {
  return <div>{children}</div>;
}

interface GithubFlavorMarkdownProps {
  className?: string;
  children: string;
  onLinkClicked(external: boolean): void;
  validStorageIds?: string[];
  isStreaming?: boolean;
}

export const GithubFlavorMarkdown = React.memo(
  RawGithubFlavorMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children && prevProps.isStreaming === nextProps.isStreaming
);

function RawGithubFlavorMarkdown({
  className,
  children,
  onLinkClicked,
  validStorageIds,
  isStreaming,
}: GithubFlavorMarkdownProps) {
  const LinkComponent = useMemo(
    () => makeLink(onLinkClicked, isStreaming),
    [onLinkClicked, isStreaming]
  );
  const ImageComponent = useMemo(
    () => (props: any) => (
      <StorageImage {...props} validStorageIds={validStorageIds} isStreaming={isStreaming} />
    ),
    [validStorageIds, isStreaming]
  );

  const components = useMemo(
    () => ({
      a: LinkComponent,
      img: ImageComponent,
      p: ParagraphDiv,
      pre: Highlighter,
      table: MarkdownTable,
      td: MarkdownTd,
    }),
    [LinkComponent, ImageComponent]
  );

  return (
    <div className={classNames(className, styles.githubFlavorMarkdown)}>
      <Streamdown
        plugins={STREAMDOWN_PLUGINS}
        components={components}
        isAnimating={isStreaming}
        animated={STREAMDOWN_ANIMATION}
      >
        {children}
      </Streamdown>
    </div>
  );
}

function makeLink(
  onLinkClicked: (external: boolean, href: string) => void | boolean,
  isStreaming?: boolean
) {
  function LinkWithExternalTarget({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    if (!href) return null;

    if (href.includes('/storage/') && isStreaming) return null;

    const info = resolveLinkTarget(href);
    return (
      <Link
        href={info.href}
        target={info.target}
        prefetch={false}
        onClick={(evt) => {
          if (onLinkClicked(!!info.target, info.href)) {
            evt.stopPropagation();
            evt.preventDefault();
          }
        }}
      >
        {children}
      </Link>
    );
  }
  return LinkWithExternalTarget;
}

function resolveLinkTarget(href: string): { href: string; target?: string } {
  if (!href.startsWith('http://') && !href.startsWith('https://')) {
    return { href };
  }

  if (typeof window === 'undefined' || !globalThis.location) {
    return { href, target: href };
  }

  const url = new URL(href);
  if (url.origin === globalThis.location.origin) return { href };

  if (url.origin === 'https://staging.openbraininstitute.org') {
    // This is a hack for the dev, because Ai Agent
    // returns absolute URLs instead of relative ones.
    return {
      href: `${globalThis.location.origin}${href.slice(url.origin.length)}`,
    };
  }

  return { href, target: href };
}
