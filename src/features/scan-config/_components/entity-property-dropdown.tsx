import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';

import authFetch from '@/auth-fetch';
import { config } from '@/config';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { useWorkspace } from '@/ui/hooks/use-workspace';

export default function EntityPropertyDropdown({
  modelId,
  value,
  onChange,
  entity_type,
  property,
}: {
  modelId: string;
  value: string | null;
  onChange: (v: string | null) => void;
  entity_type: string;
  property: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();

  const { data, error, isLoading } = useQuery({
    queryKey: keyBuilder.modelProperties({ modelId }),
    queryFn: () => fetchProperties({ modelId, virtualLabId, projectId, entity_type, property }),
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
      value={value}
      onChange={onChange}
      options={[
        { label: '—', value: null },
        ...data.map((n) => {
          return {
            label: n,
            value: n,
          };
        }),
      ]}
    />
  );
}

async function fetchProperties({
  modelId,
  virtualLabId,
  projectId,
  entity_type,
  property,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  entity_type: string;
  property: string;
}) {
  const res = await authFetch(
    `${config.OBI_ONE_URL}/declared/mapped-${entity_type}-properties/${modelId}`,
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

  const properties = (await res.json()) as Record<string, string[]>;

  return properties[property];
}
