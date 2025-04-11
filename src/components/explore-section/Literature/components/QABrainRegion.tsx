import { useAtomValue } from 'jotai';
import { ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useRouter } from 'next/navigation';

import usePathname from '@/hooks/pathname';
import { classNames } from '@/util/utils';
import { SelectedBrainRegionPerQuestion } from '@/types/literature';
import { BrainIcon } from '@/components/icons';
import { literatureSelectedBrainRegionAtom } from '@/state/brain-regions';

export function QABrainRegionPerQuestion({ id, title }: SelectedBrainRegionPerQuestion) {
  return (
    <div
      id={`brain-region-${id}`}
      className="bg-primary-0 text-primary-8 inline-flex w-full items-center justify-between gap-2 rounded-3xl px-4 py-2"
    >
      <BrainIcon />
      <div title={title} className="line-clamp-1 w-full flex-1 text-base font-bold">
        {title}
      </div>
    </div>
  );
}

function QAContextBrainRegion() {
  const selectedBrainRegion = useAtomValue(literatureSelectedBrainRegionAtom);
  const isSelectedBrainRegionExists = Boolean(selectedBrainRegion?.id);

  return (
    <div
      className={classNames(
        'flex justify-between gap-2 rounded-xs px-4 py-4',
        isSelectedBrainRegionExists ? 'bg-primary-0 text-primary-8' : 'bg-neutral-1 text-primary-8'
      )}
    >
      <div
        title={!isSelectedBrainRegionExists ? 'All regions' : selectedBrainRegion?.title}
        className="line-clamp-1 flex-1 text-lg font-bold"
        data-testid="selected-brain-region"
      >
        {!isSelectedBrainRegionExists ? 'All regions' : selectedBrainRegion?.title}
      </div>
      <Tooltip
        title="Context"
        placement="bottom"
        overlayInnerStyle={{ backgroundColor: 'white' }}
        arrow={false}
        overlay={
          <p className="text-primary-8 flex flex-col gap-2 select-none">
            In order to modify the context, select another brain region from the side panel.
          </p>
        }
        trigger="hover"
      >
        <InfoCircleOutlined className="text-primary-8 text-lg" />
      </Tooltip>
    </div>
  );
}

function QABrainRegion() {
  const pathname = usePathname();
  const isBuildSection = pathname?.startsWith('/app/build');
  const router = useRouter();

  return (
    <div className="px-4">
      {isBuildSection && (
        <Button
          onClick={() => router.back()}
          className="text-primary-8 mb-6 flex items-center rounded-none py-6"
        >
          <ArrowLeftOutlined /> Back to configuration
        </Button>
      )}
      <div className="text-primary-8 mb-2 text-lg font-medium">Current context of search: </div>
      <QAContextBrainRegion />
    </div>
  );
}

export default QABrainRegion;
