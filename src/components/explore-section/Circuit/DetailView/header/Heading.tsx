import { CircuitSchemaProps } from '../../type';
import ActionButton from './ActionButton';

import { DownloadIcon, SimulateIcon } from '@/components/icons';
import CloneIcon from '@/components/icons/Clone';

export default function Heading({ content }: { content: CircuitSchemaProps }) {
  return (
    <div className="relative flex w-full flex-row justify-between">
      <div className="relative flex flex-col">
        <div className="text-sm uppercase tracking-wider text-gray-500">Name</div>
        <h1 className="text-3xl font-bold text-primary-9">{content.name}</h1>
      </div>

      <div className="flex flex-row gap-x-6 text-primary-9">
        <ActionButton
          type="button"
          label="Simulate"
          action={() => {
            console.log('simulate');
          }}
          disabled
          link={content.files[0].url}
        >
          <SimulateIcon iconColor="#002766" className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          type="button"
          label="Clone model"
          action={() => {
            console.log('Cloned model');
          }}
          disabled
          link={content.files[0].url}
        >
          <CloneIcon className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          type="button"
          label="Save to Library"
          action={() => {
            console.log('Added to the library');
          }}
          disabled
          link={content.files[0].url}
        >
          <DownloadIcon iconColor="#002766" className="h-4 w-4" />
        </ActionButton>
        <ActionButton type="link" label="Download" link={content.files[0].url}>
          <DownloadIcon iconColor="#002766" className="h-4 w-4" />
        </ActionButton>
      </div>
    </div>
  );
}
