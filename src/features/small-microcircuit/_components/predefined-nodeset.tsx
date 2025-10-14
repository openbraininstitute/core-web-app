import { atom, useAtom } from 'jotai';
import { useQuery } from '@tanstack/react-query';

import { Select } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { ConfigValue } from './components';
import authFetch from '@/authFetch';
import { keyBuilder } from '@/ui/use-query-keys/data';

export default function PredefinedNodeset({
  circuitId,
  virtualLabId,
  projectId,
  stateAtom,
}: {
  circuitId: string;
  virtualLabId: string;
  projectId: string;
  stateAtom: ReturnType<typeof atom<{ [key: string]: ConfigValue }>>;
}) {
  const [state, setState] = useAtom(stateAtom);

  const { data, error, isLoading } = useQuery({
    queryKey: keyBuilder.circuitProperties({ circuitId }),
    queryFn: () => fetchNodesets({ circuitId, virtualLabId, projectId }),
  });

  if (error) {
    return <div className="text-red-500">There was an error downloading the nodesets</div>;
  }
  if (isLoading) {
    return <LoadingOutlined className="text-primary-8" />;
  }

  if (!data) return null;

  return (
    <Select
      className="w-full"
      value={typeof state.node_set === 'string' ? state.node_set : null}
      onChange={(v) => {
        setState({ ...state, node_set: v });
      }}
      options={[
        { label: '—', value: null },
        ...data['Circuit.NodeSet'].map((n) => {
          return {
            label: n,
            value: n,
          };
        }),
      ]}
    />
  );
}

async function fetchNodesets({
  circuitId,
  virtualLabId,
  projectId,
}: {
  circuitId: string;
  virtualLabId: string;
  projectId: string;
}) {
  const res = await authFetch(
    `${process.env.NEXT_PUBLIC_OBI_ONE_URL}/declared/mapped-circuit-properties/${circuitId}`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'virtual-lab-id': virtualLabId,
        'project-id': projectId,
      },
    }
  );

  if (!res.ok) {
    throw new Error('Error fetching node sets');
  }

  return (await res.json()) as {
    'Circuit.NodeSet': string[];
  };
}
