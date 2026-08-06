import { createMathPlugin } from '@streamdown/math';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

import { cn } from '@/utils/css-class';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { Nullish } from '@/utils/type';

import styles from './markdown-description.module.css';

// Reuses the same KaTeX plugin pair the AI assistant renders with, so math is
// consistent across the app. Overrides two of its chat-oriented defaults:
// single-dollar inline math is on (descriptions commonly write `$x$`), and the
// error colour points at a token this app actually defines.
const mathPlugin = createMathPlugin({
  singleDollarTextMath: true,
  errorColor: 'var(--color-error)',
});

// Module-level constants keep plugin/component references stable across renders.
const REMARK_PLUGINS = [remarkGfm, remarkBreaks, mathPlugin.remarkPlugin];
const REHYPE_PLUGINS = [mathPlugin.rehypePlugin];

function MarkdownLink({ href, children }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return children;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="wrap-break-word text-primary-6"
      // Descriptions can sit inside clickable cards; a link click must not
      // also trigger the card's own onClick.
      onClick={(evt) => evt.stopPropagation()}
    >
      {children}
    </a>
  );
}

const COMPONENTS = { a: MarkdownLink };

type Props = {
  children: string | Nullish;
  className?: string;
};

/**
 * Renders schema-provided description text as GitHub-flavored markdown with
 * KaTeX math support ($...$ inline, $$...$$ block). Legacy plain-text
 * descriptions keep their line breaks (remark-breaks) and bare URLs are
 * auto-linked (GFM autolink literals). Raw HTML is not rendered.
 */
export function MarkdownDescription({ children, className }: Props): ReactNode {
  if (!children) return null;

  return (
    <div className={cn(styles.markdownDescription, className)}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
