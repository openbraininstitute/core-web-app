import DiscoverObpPanel from '@/components/VirtualLab/DiscoverObpPanel';

import VirtualLabHome from '@/components/VirtualLab/VirtualLabHomePage';
import NewProjectCTABanner from '@/components/VirtualLab/VirtualLabCTABanner/NewProjectCTABanner';
import { ServerSideComponentProp } from '@/types/common';
import { UsersHorizontalList } from '@/components/VirtualLab/projects/VirtualLabProjectHomePage';

export default function VirtualLab({ params }: ServerSideComponentProp<{ virtualLabId: string }>) {
  const { virtualLabId } = params;
  return (
    <div className="flex flex-col gap-2 pb-5">
      <VirtualLabHome id={virtualLabId} />

      <NewProjectCTABanner
        id={virtualLabId}
        title="Create a project"
        subtitle="In order to start exploring brain regions, building models and simulate neuron, create a project"
      />

      <DiscoverObpPanel withTitle />
      <div className="flex flex-col">
        <div className="my-10 text-lg font-bold uppercase">Members</div>
        <UsersHorizontalList virtualLabId={virtualLabId} />
      </div>
      {/* Temporarily removing the display of highlighted projects */}
      {/* <Suspense> */}
      {/* <VirtualLabProjects id={virtualLabId} /> */}
      {/* </Suspense>  */}
    </div>
  );
}
