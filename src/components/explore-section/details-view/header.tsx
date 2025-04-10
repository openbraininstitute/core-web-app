import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { Spin, Button } from 'antd';
import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';

import BookmarkButton from '@/components/explore-section/BookmarkButton';
import usePathname from '@/hooks/pathname';
import fetchArchive from '@/api/archive';
import sessionAtom from '@/state/session';
import Link from '@/components/Link';
import useNotification from '@/hooks/notifications';

import { InteractiveViewIcon } from '@/components/icons';
import { ExperimentTypeNames } from '@/constants/explore-section/data-types/experiment-data-types';
import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';
import { BookmarksSupportedTypes } from '@/types/virtual-lab/bookmark';
import { SimulationTypeNames } from '@/types/simulation/single-neuron';
import { EntityCoreElement } from '@/constants/explore-section/fields-config/types';

export default function Header<T extends { name: string }>({
  detail,
  url,
  extraHeaderAction,
}: {
  detail: EntityCoreElement<T>;
  url?: string | null;
  extraHeaderAction?: ReactNode;
}) {
  const path = usePathname();
  const simCampMatch = path?.match(/\/explore\/simulation-campaigns\/[a-zA-Z0-9=]*/g);
  const isSimCampDetail = simCampMatch && path === simCampMatch[0];
  const notification = useNotification();
  const session = useAtomValue(sessionAtom);
  const [fetching, setFetching] = useState<boolean>(false);
  const hasDistribution = 'distribution' in detail && detail.distribution !== undefined;

  const { virtualLabId, projectId, experimentType, modelType, simulationType, synaptome } =
    useParams<{
      virtualLabId?: string;
      projectId?: string;
      experimentType?: ExperimentTypeNames;
      modelType?: ModelTypeNames;
      simulationType?: SimulationTypeNames;
      synaptome?: ModelTypeNames;
    }>();

  const supportedBookmarkType: BookmarksSupportedTypes | undefined =
    experimentType ?? modelType ?? simulationType ?? synaptome;

  const errorOnDownload = () => {
    setFetching(false);
    notification.error('Resource could not be downloaded');
  };

  return (
    <div className="flex flex-col text-primary-7">
      <div className="text font-thin">Name</div>
      <div className="flex justify-between">
        <div className="grid grid-cols-6 items-center gap-5">
          <div className="col-span-3 text-2xl font-bold">{detail?.name}</div>
        </div>
        {session && (
          <div className="flex items-center gap-2">
            {extraHeaderAction}
            {virtualLabId && projectId && supportedBookmarkType && (
              <BookmarkButton
                virtualLabId={virtualLabId}
                projectId={projectId}
                resourceId={detail.id}
                type={supportedBookmarkType}
              />
            )}
            <Button
              type="text"
              className="flex items-center gap-2 text-primary-7 hover:bg-transparent!"
              // disabling download button if currently fetching or if resource does not have a distribution
              disabled={fetching || !hasDistribution}
              onClick={() => {
                setFetching(true);
                fetchArchive([detail.id], session, () => setFetching(false), errorOnDownload);
              }}
            >
              Download
              {fetching ? (
                <Spin
                  className="border border-neutral-2 px-4 py-3"
                  indicator={<LoadingOutlined />}
                />
              ) : (
                <DownloadOutlined className="border border-neutral-2 px-4 py-3" />
              )}
            </Button>
          </div>
        )}

        {isSimCampDetail && (
          <div className="flex gap-2">
            <Link href={`${path}/experiment-interactive`} className="flex items-center gap-2">
              Browse through interactive view
              <div className="border border-neutral-4 p-2 text-primary-7">
                <InteractiveViewIcon />
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
