'use client';

import 'katex/dist/katex.min.css';

import { memo } from 'react';
import Markdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

function MarkdownViewImpl({ source }: { source: string }) {
  if (!source.trim()) {
    return <span className="text-neutral-3 text-sm italic">Empty markdown cell</span>;
  }
  return (
    <Markdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {source}
    </Markdown>
  );
}

export const MarkdownView = memo(MarkdownViewImpl);
