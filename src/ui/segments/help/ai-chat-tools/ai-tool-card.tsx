'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { useAITool } from '@/services/ai-agent/tools/tools';
import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools';
import slugiy from '@/util/slugify';

function MarkdownCodeBlock({ children }: { children?: React.ReactNode }) {
  return (
    <pre className="border-neutral-2 text-neutral-5 mt-3 flex flex-row gap-x-2 rounded-md border border-solid px-3 py-2 text-base">
      <InfoCircleOutlined />
      <code>{children}</code>
    </pre>
  );
}

export default function AIToolCard({ content }: { content: AIChatToolsSectionProps }) {
  const detailed = useAITool(content.id);
  const description =
    detailed?.description || content?.description_frontend || content?.description || '';

  return (
    <article
      key={content.name ?? content.id ?? `feature-${Math.random()}`}
      className="border-neutral-2 text-primary-9 flex w-2/3 flex-col border border-solid p-6"
      id={slugiy(content.name)}
    >
      <h2 className="text-primary-9 text-2xl font-bold">{content.name}</h2>

      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        className="text-[1.2em] leading-normal"
        rehypePlugins={[rehypeRaw]}
        components={{
          code: MarkdownCodeBlock,
        }}
      >
        {description}
      </ReactMarkdown>
    </article>
  );
}
