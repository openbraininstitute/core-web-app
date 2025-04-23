import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { tryCatch } from '@/api/utils';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';

import { ErrorListing, GetProPlanCard } from '@/components/VirtualLab/labs-listing/elements';
import CreateFirstLab from '@/components/VirtualLab/labs-listing/no-vlabs';
import CardItem from '@/components/VirtualLab/item/vlab-item';

type Props = {
  hasProSubscription: boolean;
};

export default async function MyVirtualLabCard({ hasProSubscription }: Props) {
  const { data: result, error } = await tryCatch(
    listVirtualLabs({ include: [LabTypeEnum.MY_LAB] }),
    undefined,
    {
      section: 'virtual-lab-home-page',
      feature: 'list-virtual-labs',
      extra: { 'my-virtual-lab': true },
    }
  );
  const myLab = result?.data?.virtual_lab;
  if (!myLab) {
    return <CreateFirstLab showCreateSubscription={hasProSubscription} />;
  }
  if (error) {
    return <ErrorListing />;
  }
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3">
      {!hasProSubscription && <GetProPlanCard />}
      <CardItem
        key={myLab?.id}
        id={myLab?.id}
        name={myLab?.name}
        lastUpdate={myLab?.updated_at}
        projectCount={myLab?.projects_count}
        memberCount={myLab?.members_count}
      />
    </div>
  );
}
