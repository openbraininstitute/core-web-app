import Link from 'next/link';
import React, { AnchorHTMLAttributes, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import TruncableImage from './truncable-image';

import { classNames } from '@/util/utils';

import styles from './github-flavor-markdown.module.css';

interface GithubFlavorMarkdownProps {
  className?: string;
  children: string;
  onLinkClicked(external: boolean): void;
}

export const GithubFlavorMarkdown = React.memo(RawGithubFlavorMarkdown);

function RawGithubFlavorMarkdown({
  className,
  children,
  onLinkClicked,
}: GithubFlavorMarkdownProps) {
  const LinkComponent = useMemo(() => makeLink(onLinkClicked), [onLinkClicked]);

  return (
    <ReactMarkdown
      className={classNames(className, styles.githubFlavorMarkdown)}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: LinkComponent,
        img: TruncableImage,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function makeLink(onLinkClicked: (external: boolean, href: string) => void | boolean) {
  function LinkWithExternalTarget({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    if (!href) return null;

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
