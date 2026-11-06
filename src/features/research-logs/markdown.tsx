'use client';

import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { entityAssetsPath, entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { EntityCard, entityIdFromHref } from './entity-card';

import type { ComponentProps, ReactElement, ReactNode } from 'react';
import type { Components } from 'react-markdown';

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

/** A relative image path is a file in the log's `research_log_files` directory. */
function LogImage({
  src,
  alt,
  logId,
  filesAssetId,
}: {
  src?: string;
  alt?: string;
  logId?: string;
  filesAssetId?: string;
}) {
  const ctx = useWorkspace();
  const relative = !!src && !isExternal(src) && !src.startsWith('data:');
  const { data } = useQuery({
    queryKey: ['research-log-file', logId, filesAssetId, src],
    enabled: relative && !!logId && !!filesAssetId,
    staleTime: Infinity,
    queryFn: async () => {
      const api = await entityCoreApi();
      const res = await api.get<Response>(
        `${entityAssetsPath('research_log', logId!)}/${filesAssetId}/download`,
        {
          headers: getEntityCoreContext(ctx).headers,
          queryParams: { asset_path: src!.replace(/^\.?\//, '') },
        },
        { asRawResponse: true }
      );
      return URL.createObjectURL(await res.blob());
    },
  });
  if (relative && !data) return <span className="text-neutral-4 text-sm">[{alt || src}]</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={relative ? data : src} alt={alt ?? ''} className="my-3 max-w-full rounded-lg" />;
}

function onlyChild(children: ReactNode): ReactElement<ComponentProps<'a'>> | null {
  const arr = Array.isArray(children) ? children : [children];
  const real = arr.filter((c) => !(typeof c === 'string' && c.trim() === ''));
  const first = real[0] as ReactElement<ComponentProps<'a'>> | undefined;
  return real.length === 1 &&
    first &&
    typeof first === 'object' &&
    typeof first.props?.href === 'string'
    ? first
    : null;
}

/**
 * Renders a research log's markdown. A paragraph holding nothing but a link to an entity
 * (`/app/entity/<id>`) becomes a card; in-line entity links stay links.
 */
export function ResearchLogMarkdown({
  markdown,
  logId,
  filesAssetId,
}: {
  markdown: string;
  logId?: string;
  filesAssetId?: string;
}) {
  const components: Components = {
    p({ children }) {
      const link = onlyChild(children);
      const id = entityIdFromHref(link?.props.href);
      if (link && id) return <EntityCard id={id} fallbackHref={link.props.href ?? id} />;
      return <p>{children}</p>;
    },
    a({ href, children }) {
      const external = !!href && isExternal(href);
      return (
        <a
          href={href}
          target={external || entityIdFromHref(href) ? '_blank' : undefined}
          rel="noreferrer noopener"
          className="text-primary-7 underline"
        >
          {children}
        </a>
      );
    },
    img: ({ src, alt }) => (
      <LogImage
        src={typeof src === 'string' ? src : undefined}
        alt={alt}
        logId={logId}
        filesAssetId={filesAssetId}
      />
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="border-neutral-2 w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-neutral-2 bg-neutral-1 border px-3 py-1.5 text-left">{children}</th>
    ),
    td: ({ children }) => <td className="border-neutral-2 border px-3 py-1.5">{children}</td>,
    h1: ({ children }) => (
      <h1 className="mt-6 mb-3 text-2xl font-bold text-primary-9">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mt-6 mb-2 text-xl font-bold text-primary-9">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-5 mb-2 text-lg font-semibold text-primary-9">{children}</h3>
    ),
    ul: ({ children }) => <ul className="my-2 list-disc pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal pl-6">{children}</ol>,
    blockquote: ({ children }) => (
      <blockquote className="border-neutral-3 text-neutral-6 my-3 border-l-4 pl-4">
        {children}
      </blockquote>
    ),
    pre: ({ children }) => (
      <pre className="bg-neutral-1 my-3 overflow-x-auto rounded-lg p-3 text-sm">{children}</pre>
    ),
    code: ({ children, className }) => (
      <code className={className ?? 'bg-neutral-1 rounded px-1 py-0.5 text-[0.9em]'}>
        {children}
      </code>
    ),
  };

  return (
    <div className="text-primary-9 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
