'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { StandardFallback } from '@/components/build-section/cell-model-assignment/e-model/EModelView/ErrorMessageLine';
import { log } from '@/utils/logger';

import Header from '@/components/build-section/cell-model-assignment/e-model/EModelView/Header';
import DocumentationIcon from '@/components/icons/Documentation';

import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  // @FIXME: Unused prop?
  // eslint-disable-next-line react/no-unused-prop-types
  params: WorkspaceContext & { id: string };
  source: IEModel;
};

export default function IonChannels({ source }: Props) {
  const [channels, updateChannels] = useState<Record<string, Array<string>> | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
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
            setError('Ion channels location distribution not found');
          } else if (err.code === 'InvalidJson') {
            setError('Ion channels location distribution is invalid');
          } else {
            setError('Failed to fetch ion channels location distribution');
          }
        }
        const json = await response.json();
        updateChannels(json);
      } catch (e) {
        log('error', e);
        updateChannels(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [source.name]);

  if (isLoading)
    return (
      <div className="text-neutral-1 flex items-center justify-center text-3xl">
        <LoadingOutlined />
      </div>
    );
  if (error)
    return (
      <StandardFallback type="info" message={error}>
        Ion channels
      </StandardFallback>
    );
  if (!channels)
    return (
      <StandardFallback type="info" message="No ion channel location distribution found">
        Ion channels
      </StandardFallback>
    );

  return (
    <div className="flex flex-col gap-2">
      <Header>Ion channels</Header>
      <ListingGrid ionChannels={channels} />
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
