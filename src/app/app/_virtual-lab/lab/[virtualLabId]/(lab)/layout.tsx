import { ErrorBoundary } from 'react-error-boundary';
import { LoadingOutlined } from '@ant-design/icons';
import { ReactNode, Suspense } from 'react';
import { Spin } from 'antd';

import { Label, LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import VirtualLabSidebar from '@/components/VirtualLab/VirtualLabSidebar';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideMenu from '@/components/SideMenu';

type Props = {
  children: ReactNode;
  params: Promise<{
    virtualLabId: string;
  }>;
};

export default async function VirtualLabLayout({ params: promisedParams, children }: Props) {
  const params = await promisedParams;

  return (
    <div className="bg-primary-9 flex h-screen overflow-y-auto text-white">
      <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
        <SideMenu
          links={[]}
          lab={{
            key: LinkItemKey.VirtualLab,
            id: params.virtualLabId,
            label: Label.VirtualLab,
            href: `/app/virtual-lab/lab/${params.virtualLabId}/overview`,
          }}
        />
        <div className="bg-primary-9 flex h-screen w-full overflow-y-scroll p-8 text-white">
          <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
            <div className="m-w-3/12 flex flex-row gap-4" style={{ width: '25%' }}>
              <VirtualLabSidebar virtualLabId={params.virtualLabId} />
            </div>
            <div className="m-w-9/12 flex h-full flex-col" style={{ width: '75%' }}>
              <Suspense
                fallback={
                  <div className="flex h-screen items-center justify-center">
                    <Spin size="large" indicator={<LoadingOutlined />} />
                  </div>
                }
              >
                {children}
              </Suspense>
            </div>
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    </div>
  );
}
