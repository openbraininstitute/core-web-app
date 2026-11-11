'use client';

import { cn } from '@/utils/css-class';

import { standard } from '../data';
import { categoryColor } from '../ui';
import { AcceptedFiles } from './accepted-files';
import { PropertyList } from './property-list';
import { SdkSnippets } from './sdk-snippets';

import type { StdEntity } from '../types';

const METHOD_STYLE: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-sky-50 text-sky-700 border-sky-200',
};

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:gap-3">
      <span
        className={cn(
          'inline-flex w-fit shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-xs font-medium',
          METHOD_STYLE[method]
        )}
      >
        {method}
      </span>
      <code className="font-mono text-sm text-neutral-7">{path}</code>
      <span className="text-sm text-neutral-4 sm:ml-auto sm:text-right">{desc}</span>
    </div>
  );
}

function SourceBadge() {
  return (
    <span className="border-neutral-2 inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs text-neutral-4">
      <span
        className={cn(
          'size-1.5 rounded-full',
          standard.generatedFrom === 'live' ? 'bg-emerald-500' : 'bg-amber-500'
        )}
        aria-hidden
      />
      {standard.generatedFrom === 'live' ? 'From the live API' : 'Snapshot'}
      {standard.apiVersion ? (
        <span className="text-label">· API v{standard.apiVersion}</span>
      ) : null}
    </span>
  );
}

/** One entity type of the standard: its properties, accepted files, entitysdk snippets and endpoints. */
export function StandardEntityDetail({
  entity,
  onSelectEntity,
}: {
  entity: StdEntity;
  onSelectEntity: (slug: string) => void;
}) {
  const color = categoryColor(entity.category);
  const category = standard.categories.find((c) => c.id === entity.category);
  const hasFiles = entity.files.length > 0;

  return (
    <div className="max-w-[820px]">
      <span className="text-sm font-medium" style={{ color }}>
        {category?.title}
      </span>
      <h2 className="mt-1 font-title text-2xl font-semibold text-primary-9">{entity.title}</h2>
      <p className="mt-1.5 text-base text-neutral-5">{entity.short}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="border-neutral-2 bg-neutral-1 rounded border px-1.5 py-0.5 font-mono text-xs text-neutral-6">
          {entity.apiPath}
        </code>
        <code className="border-neutral-2 bg-neutral-1 rounded border px-1.5 py-0.5 font-mono text-xs text-neutral-6">
          {entity.schema}
        </code>
        <SourceBadge />
      </div>

      <p className="mt-6 leading-relaxed text-neutral-6">{entity.description}</p>

      {entity.parents?.length ? (
        <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm text-neutral-5">
          Inherits from
          {entity.parents.map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-label">›</span>}
              <code className="border-neutral-2 bg-neutral-1 rounded border px-1.5 py-0.5 font-mono text-xs text-neutral-6">
                {p}
              </code>
            </span>
          ))}
          <span className="text-label">· inherited fields are marked “from …”</span>
        </p>
      ) : null}

      {entity.taskKey ? (
        <section className="mt-6 rounded-xl border border-dashed border-neutral-3 p-4">
          <h3 className="text-sm font-semibold text-neutral-7">
            Generic, by <code className="font-mono">{entity.taskKey.name}</code>
          </h3>
          <p className="mt-1 text-sm text-neutral-5">
            {entity.taskKey.values.length > 1
              ? `One entity type for every kind; set ${entity.taskKey.name} to one of these ${entity.taskKey.values.length}:`
              : `This entry is the kind with ${entity.taskKey.name} =`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {entity.taskKey.values.map((v) => (
              <code
                key={v}
                className="border-neutral-2 bg-neutral-1 rounded border px-1 py-0.5 font-mono text-[0.7rem] text-neutral-6"
              >
                {v}
              </code>
            ))}
          </div>
        </section>
      ) : null}

      {/* Properties */}
      <section className="mt-8">
        <h3 className="text-base font-semibold text-neutral-7">
          Properties <span className="font-normal text-label">{entity.properties.length}</span>
        </h3>
        <p className="mt-1 text-sm text-neutral-4">
          Fields specific to this entity type, resolved from its{' '}
          <code className="font-mono text-neutral-6">{entity.schema}</code> schema.
        </p>
        <div className="mt-3">
          <PropertyList properties={entity.properties} onSelectEntity={onSelectEntity} />
        </div>
      </section>

      {/* Common fields */}
      {entity.commonProperties.length > 0 ? (
        <section className="mt-8">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-base font-semibold text-neutral-7">
              <span className="transition group-open:rotate-90">›</span>
              Common entity fields
              <span className="font-normal text-label">{entity.commonProperties.length}</span>
            </summary>
            <p className="mt-2 text-sm text-neutral-4">
              The shared envelope every entity carries: identity, timestamps, provenance, attached
              assets and authorization.
            </p>
            <div className="mt-3">
              <PropertyList properties={entity.commonProperties} onSelectEntity={onSelectEntity} />
            </div>
          </details>
        </section>
      ) : null}

      {/* Accepted files */}
      <section className="mt-8">
        <h3 className="text-base font-semibold text-neutral-7">
          Accepted files <span className="font-normal text-label">{entity.files.length}</span>
        </h3>
        <p className="mt-1 text-sm text-neutral-4">
          Files attach to a {entity.title} as <em>assets</em>. Each label is a governed slot pinned
          to one or more content types.
        </p>
        <div className="mt-3">
          <AcceptedFiles groups={entity.files} />
        </div>
      </section>

      {/* entitysdk */}
      <section className="mt-8">
        <h3 className="text-base font-semibold text-neutral-7">
          Using entitysdk{' '}
          <span className="font-normal text-label">{entity.sdk.operations.length}</span>
        </h3>
        <p className="mt-1 text-sm text-neutral-4">
          The Python client for the standard — fetch, query and register a {entity.title} (and
          attach its files).
        </p>
        <div className="mt-3">
          <SdkSnippets setup={entity.sdk.setup} operations={entity.sdk.operations} />
        </div>
      </section>

      {/* obi-one: validated registration */}
      {entity.registration?.length ? (
        <section className="mt-8">
          <h3 className="text-base font-semibold text-neutral-7">
            Validated registration (obi-one)
          </h3>
          <p className="mt-1 text-sm text-neutral-4">
            Register through obi-one rather than entitycore directly: it checks the files first, and
            fills in what can be computed from them.
          </p>
          <div className="border-neutral-2 divide-neutral-2 mt-3 divide-y overflow-hidden rounded-xl border bg-white">
            {entity.registration.map((r) => (
              <div key={r.path} className="flex flex-col gap-1 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex w-fit shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-xs font-medium',
                      METHOD_STYLE[r.method]
                    )}
                  >
                    {r.method}
                  </span>
                  <code className="font-mono text-sm text-neutral-7">{r.path}</code>
                  {r.body ? <span className="text-xs text-label">{r.body}</span> : null}
                </div>
                <span className="text-sm font-medium text-neutral-6">{r.summary}</span>
                {r.description ? (
                  <span className="text-sm text-neutral-4">{r.description}</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* REST API */}
      <section className="mt-8">
        <h3 className="text-base font-semibold text-neutral-7">REST endpoints</h3>
        <p className="mt-1 text-sm text-neutral-4">
          Endpoints exposed by entitycore for this type.
        </p>
        <div className="border-neutral-2 divide-neutral-2 mt-3 divide-y overflow-hidden rounded-xl border bg-white">
          <Endpoint
            method="GET"
            path={entity.apiPath}
            desc={`List & filter ${entity.title} entities`}
          />
          <Endpoint method="POST" path={entity.apiPath} desc={`Register a new ${entity.title}`} />
          <Endpoint method="GET" path={`${entity.apiPath}/{id}`} desc="Fetch one by id" />
          {hasFiles ? (
            <Endpoint
              method="POST"
              path={`${entity.apiPath}/{id}/assets`}
              desc="Upload a file asset"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
