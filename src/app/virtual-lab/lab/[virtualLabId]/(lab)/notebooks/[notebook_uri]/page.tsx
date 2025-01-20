import { Suspense } from 'react';
import DiscoverObpPanel from '@/components/VirtualLab/DiscoverObpPanel';

import VirtualLabHome from '@/components/VirtualLab/VirtualLabHomePage';
import VirtualLabUsers from '@/components/VirtualLab/VirtualLabHomePage/VirtualLabUsers';
import { ServerSideComponentProp } from '@/types/common';
import NewProjectCTABanner from '@/components/VirtualLab/VirtualLabCTABanner/NewProjectCTABanner';

export default function VirtualLab({
  params: { notebook_uri },
}: ServerSideComponentProp<{ notebook_uri: string }>) {


  console.log(notebook_uri)

  
  return (
    <div className="h-full w-full bg-white">
      <iframe src={`https://nbviewer.org/github/${notebook_uri}`} width="100%" height="100%" />
    </div>
  );
}
