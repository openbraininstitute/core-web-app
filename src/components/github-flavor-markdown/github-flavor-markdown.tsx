import Link from 'next/link';
import React, { AnchorHTMLAttributes } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import { classNames } from '@/util/utils';

import styles from './github-flavor-markdown.module.css';

interface GithubFlavorMarkdownProps {
  className?: string;
  children: string;
}

export function GithubFlavorMarkdown({ className, children }: GithubFlavorMarkdownProps) {
  return (
    <div className={classNames(className, styles.githubFlavorMarkdown)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: LinkWithExternalTarget,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
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
