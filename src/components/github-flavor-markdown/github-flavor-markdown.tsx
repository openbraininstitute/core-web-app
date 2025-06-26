import Link from 'next/link';
import React, { AnchorHTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import { classNames } from '@/util/utils';

import styles from './github-flavor-markdown.module.css';

export interface GithubFlavorMarkdownProps {
  className?: string;
  children: string;
}

export function GithubFlavorMarkdown({ className, children }: GithubFlavorMarkdownProps) {
  return (
    <ReactMarkdown
      className={classNames(className, styles.githubFlavorMarkdown)}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        a: LinkWithExternalTarget,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function LinkWithExternalTarget({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return null;

  return (
    <Link href={href} target="_blank">
      {children}
    </Link>
  );
}
