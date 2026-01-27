'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import { DocumentationIcon } from '@/components/icons/Documentation';
import { StandardFallback } from '@/features/entities/e-model/detail-view/error-message-line';
import { Header } from '@/features/entities/e-model/detail-view/header';
import { keyBuilder } from '@/ui/use-query-keys/data';

type Props = {
  source: IEModel;
};

export default function IonChannels({ source }: Props) {
  const { data, error, isLoading } = useQuery({
    queryKey: keyBuilder.ionChannelsFile({ entityName: source.name }),
    queryFn: async () => {
      const response = await fetch(
        `${window.location.origin}/api/emodel-channels-location/${source.name}`,
        {
          method: 'get',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        if (err.code === 'FileNotFound') {
          throw new Error('Ion channels location distribution not found');
        } else if (err.code === 'InvalidJson') {
          throw new Error('Ion channels location distribution is invalid');
        } else {
          throw new Error('Failed to fetch ion channels location distribution');
        }
      }
      const json = await response.json();
      return json;
    },
    enabled: !!source.name,
  });

  if (isLoading)
    return (
      <div className="text-neutral-1 flex items-center justify-center text-3xl">
        <LoadingOutlined />
      </div>
    );
  if (error)
    return (
      <StandardFallback type="info" message={error.message}>
        Ion channel models
      </StandardFallback>
    );
  if (!data)
    return (
      <StandardFallback type="info" message="No ion channel location distribution found">
        Ion channel models
      </StandardFallback>
    );

  return (
    <div className="flex flex-col gap-2">
      <Header>Ion channel models</Header>
      <ListingGrid ionChannels={data} />
    </div>
  );
}

function ListingGrid({ ionChannels }: { ionChannels: Record<string, Array<string>> }) {
  return (
    <div className="grid grid-flow-col gap-2">
      {Object.entries(ionChannels).map(([location, channelList]) => (
        <div key={location} className="flex flex-col items-start justify-start">
          <div className="my-4 flex items-center gap-2 text-gray-400">
            {location.toUpperCase()}
            <DocumentationIcon className="h-3 w-auto" />
          </div>
          <ol className="list-inside list-decimal">
            {channelList.map((channelName) => (
              <li key={channelName} className="font-bold marker:font-light">
                {channelName}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
