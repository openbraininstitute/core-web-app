'use client';

import { useQuery } from '@tanstack/react-query';
import { Input } from 'antd';
import Link from 'next/link';
import { useState } from 'react';

import { LoadFailure } from '../../../shared/grid';
import { adminQueryKeys } from '../../../shared/query-keys';
import { adminHref } from '../../../shell/admin-link';
import { listLabs, listProjects, searchUsers } from '../api/admin';
import { userDisplayName } from './user-roles';

const RESULT_LIMIT = 8;

type Hit = { id: string; title: string; detail?: string | null };

function SearchGroup({
  title,
  kind,
  query,
  search,
}: {
  title: string;
  kind: Parameters<typeof adminHref>[0];
  query: string;
  search: () => Promise<Hit[]>;
}) {
  const { data: hits, error } = useQuery({
    queryKey: [...adminQueryKeys.search({ query }), kind],
    queryFn: search,
  });

  return (
    <section className="border-neutral-2 flex min-w-0 flex-col gap-1 rounded-lg border bg-white p-4">
      <h2 className="text-primary-9 mb-1 font-semibold">{title}</h2>
      {error && <LoadFailure error={error} what={title.toLowerCase()} />}
      {!hits && !error && <p className="text-neutral-4">Searching</p>}
      {hits?.length === 0 && <p className="text-neutral-4">Nothing found</p>}
      {hits?.map(({ id, title: hitTitle, detail }) => (
        <Link
          key={id}
          href={adminHref(kind, id)}
          className="hover:bg-neutral-1 flex flex-col rounded px-2 py-1.5 leading-tight"
        >
          <span className="text-primary-9 truncate font-semibold">{hitTitle}</span>
          {detail && <span className="text-neutral-4 truncate text-sm">{detail}</span>}
        </Link>
      ))}
    </section>
  );
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const params = { query, page_size: RESULT_LIMIT };

  return (
    <div className="flex flex-col gap-3">
      <Input.Search
        allowClear
        placeholder="Search virtual labs, projects and users"
        onSearch={(value) => setQuery(value.trim())}
        className="max-w-xl"
      />
      {query && (
        <div className="grid grid-cols-3 gap-4">
          <SearchGroup
            title="Virtual labs"
            kind="vlab"
            query={query}
            search={async () =>
              (await listLabs(params)).data.map((lab) => ({
                id: lab.id,
                title: lab.name,
                detail: lab.reference_email,
              }))
            }
          />
          <SearchGroup
            title="Projects"
            kind="project"
            query={query}
            search={async () =>
              (await listProjects(params)).data.map((project) => ({
                id: project.id,
                title: project.name,
                detail: project.virtual_lab_name,
              }))
            }
          />
          <SearchGroup
            title="Users"
            kind="user"
            query={query}
            search={async () =>
              (await searchUsers(params)).data.map((user) => ({
                id: user.id,
                title: userDisplayName(user),
                detail: user.email,
              }))
            }
          />
        </div>
      )}
    </div>
  );
}
