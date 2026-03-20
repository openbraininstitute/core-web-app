import Link from 'next/link';
import React, { type AnchorHTMLAttributes, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { classNames } from '@/util/utils';

import { Highlighter } from './highlighter';
import PlotErrorMessage from './plot-error-message';
import StorageImage from './storage-image/storage-image';

import styles from './github-flavor-markdown.module.css';

interface GithubFlavorMarkdownProps {
  className?: string;
  children: string;
  onLinkClicked(external: boolean): void;
  validStorageIds?: string[];
  isStreaming?: boolean;
}

export const GithubFlavorMarkdown = React.memo(
  RawGithubFlavorMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
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
    [onLinkClicked, validStorageIds, isStreaming]
  );
  const ImageComponent = useMemo(
    () => (props: any) => (
      <StorageImage {...props} validStorageIds={validStorageIds} isStreaming={isStreaming} />
    ),
    [validStorageIds, isStreaming]
  );
  return (
    <ReactMarkdown
      className={classNames(className, styles.githubFlavorMarkdown)}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: LinkComponent,
        img: ImageComponent,
        p: ({ children }) => <div>{children}</div>,
        pre: Highlighter,
      }}
    >
      {children}
    </ReactMarkdown>
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
