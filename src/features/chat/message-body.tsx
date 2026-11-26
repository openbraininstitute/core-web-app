'use client';

import { useQuery } from '@tanstack/react-query';
import { kebabCase } from 'es-toolkit/compat';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { getEntity } from '@/api/entitycore/queries/general/entity';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactElement, ReactNode } from 'react';
import type { Components } from 'react-markdown';

const ENTITY = /\/app\/entity\/([0-9a-f-]{36})/;
const entityIdOf = (href?: string) => (href ? ENTITY.exec(href)?.[1] : undefined);

/** `mention:` links carry who an @ names; everything else is markdown's usual safe set. */
const urlTransform = (url: string) => (url.startsWith('mention:') ? url : defaultUrlTransform(url));

/** The one link a paragraph holds and nothing else, if it holds one. */
function onlyLink(children: ReactNode) {
  const kids = (Array.isArray(children) ? children : [children]).filter(
    (c) => !(typeof c === 'string' && c.trim() === '')
  );
  const first = kids[0] as ReactElement<ComponentProps<'a'>> | undefined;
  return kids.length === 1 && typeof first?.props?.href === 'string' ? first : null;
}

const typeLabel = (type: string) => type.replace(/_/g, ' ');

/** The generic lookup gives an entity's type; its name comes from that type's own endpoint. */
async function entityBrief(id: string, context: ReturnType<typeof useWorkspace>) {
  const { type } = await getEntity({ id, context });
  const api = await entityCoreApi();
  const full = await api
    .get<{ name?: string }>(`/${kebabCase(type)}/${id}`, {
      headers: getEntityCoreContext(context).headers,
    })
    .catch(() => null);
  return { type, name: full?.name };
}

/** An OBI entity named in a message: its type and name, opening it in a new tab. */
function EntityCard({ id, fallback }: { id: string; fallback: ReactNode }) {
  const context = useWorkspace();
  const { data, isError } = useQuery({
    queryKey: ['chat', 'entity', id],
    queryFn: () => entityBrief(id, context),
    staleTime: 10 * 60_000,
    retry: false,
  });
  return (
    <a
      href={`/app/entity/${id}`}
      target="_blank"
      rel="noreferrer"
      className="border-neutral-2 hover:border-primary-4 my-1 flex max-w-md flex-col rounded-xl border bg-white px-3 py-2 no-underline transition-colors"
    >
      <span className="text-neutral-4 text-[11px] tracking-wide uppercase">
        {data ? typeLabel(data.type) : isError ? 'Entity' : 'Loading…'}
      </span>
      <span className="text-primary-9 truncate font-semibold">{data?.name ?? fallback}</span>
    </a>
  );
}

export function MessageBody({ body, meId }: { body: string; meId?: string }) {
  const components: Components = {
    p({ children }) {
      const link = onlyLink(children);
      const id = entityIdOf(link?.props.href);
      if (link && id) return <EntityCard id={id} fallback={link.props.children} />;
      return <p className="my-0.5 whitespace-pre-wrap">{children}</p>;
    },
    a({ href, children }) {
      if (href?.startsWith('mention:')) {
        const mine = href.slice('mention:'.length) === meId;
        return (
          <span
            className={cn(
              'rounded px-1 font-semibold',
              mine ? 'bg-amber-100 text-amber-900' : 'text-primary-7 bg-primary-1/60'
            )}
          >
            {children}
          </span>
        );
      }
      const external = !!href && /^https?:\/\//.test(href) && !href.includes(window.location.host);
      return (
        <a
          href={href}
          target={external || entityIdOf(href) ? '_blank' : undefined}
          rel="noreferrer noopener"
          className="text-primary-7 underline"
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
    pre: ({ children }) => (
      <pre className="bg-neutral-1 my-1 overflow-x-auto rounded-lg p-2 text-[13px]">{children}</pre>
    ),
    code: ({ children, className }) => (
      <code className={className ?? 'bg-neutral-1 rounded px-1 text-[0.9em]'}>{children}</code>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-neutral-3 text-neutral-6 my-1 border-l-4 pl-3">
        {children}
      </blockquote>
    ),
  };
  return (
    <div className="text-primary-9 min-w-0 text-[15px] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={urlTransform}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
