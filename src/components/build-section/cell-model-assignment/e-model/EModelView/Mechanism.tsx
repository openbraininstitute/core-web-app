import groupBy from 'lodash/groupBy';

import DocumentationIcon from '@/components/icons/Documentation';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  // @FIXME: Unused prop?
  // eslint-disable-next-line react/no-unused-prop-types
  params: WorkspaceContext & { id: string };
  ionChannels: Array<IonChannelModel>;
};

const eModelTypes = [
  'ALL',
  'ALLACT',
  'APICAL',
  'AXONAL',
  'BASAL',
  'SOMADEND',
  'SOMATIC',
  'SOMAXON',
];

function getRandomEModelType(): string {
  const index = Math.floor(Math.random() * eModelTypes.length);
  return eModelTypes[index];
}
export default function Mechanism({ ionChannels }: Props) {
  const ionChannelsFormatted = ionChannels.map((o) => ({ ...o, location: getRandomEModelType() }));
  return <ListingGrid ionChannels={ionChannelsFormatted} />;
}

function ListingGrid({ ionChannels }: { ionChannels: Array<IonChannelModel> }) {
  const groupedIonChannels = groupBy(ionChannels, 'location');
  return (
    <div className="grid grid-flow-col gap-2">
      {Object.entries(groupedIonChannels).map(([location, channels]) => (
        <div key={location} className="flex flex-col items-start justify-start">
          <div className="my-4 flex items-center gap-2 text-gray-400">
            {location.toUpperCase()}
            <DocumentationIcon className="h-3 w-auto" />
          </div>
          <ol className="list-inside list-decimal">
            {channels.map((o) => (
              <li key={o.id} className="font-bold marker:font-light">
                {o.name}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
