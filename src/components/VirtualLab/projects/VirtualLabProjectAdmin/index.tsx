'use client';

import { atomWithExpiration } from '@/util/atoms';
import { useAtom } from 'jotai';
import { atomWithRefresh } from 'jotai/utils';
import { useEffect } from 'react';

const dataAtom = atomWithExpiration(
  async () => {
    return fetch('https://jsonplaceholder.typicode.com/posts').then((response) => response.json());
  },
  {
    ttl: 1000,
  }
);

export default function VirtualLabProjectAdmin({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const [data, refreshData] = useAtom(dataAtom);

  // useEffect(() => {
  //   refreshData();
  // }, [refreshData]);

  return (
    <div>
      <h1>VirtualLabProjectAdmin</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
