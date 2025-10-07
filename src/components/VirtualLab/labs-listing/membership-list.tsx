import isEmpty from 'es-toolkit/compat/isEmpty';

import {
  EmptySearchMembershipVirtualLabs,
  ErrorListing,
  MembershipVirtualLabsEmpty,
} from '@/components/VirtualLab/labs-listing/elements';
import { listVirtualLabs } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { LabTypeEnum } from '@/api/virtual-lab-svc/types';
import { tryCatch } from '@/api/utils';

import MembershipLabsListing from '@/components/VirtualLab/labs-listing/membership-labs';

type Props = {
  searchParams?: {
    page?: string;
    size?: string;
    q?: string;
  };
};

export default async function MembershipsVirtualLabsList({ searchParams }: Props) {
  const currentPage = Number(searchParams?.page || 1);
  const pageSize = Number(searchParams?.size || 5);
  const querySearch = String(searchParams?.q || '');

  const { data: result, error } = await tryCatch(
    listVirtualLabs({
      include: [LabTypeEnum.MEMBERSHIP_LABS],
      page: currentPage,
      size: pageSize,
      query: querySearch,
    }),
    undefined,
    {
      section: 'virtual-lab-home-page',
      feature: 'list-virtual-labs',
      extra: { 'membership-virtual-labs': true },
    }
  );

  if (error) {
    return <ErrorListing />;
  }

  const labs = result?.data?.membership_labs?.results ?? [];
  const totalLabs = result?.data?.membership_labs?.total ?? 0;
  const hasFilteredResults = (result?.data?.membership_labs?.filtered_total ?? 0) > 0;
  const hasMembershipLabs = (result?.data?.membership_labs.total ?? 0) > 0;

  if (!isEmpty(querySearch) && !hasFilteredResults)
    return <EmptySearchMembershipVirtualLabs searchValue={querySearch} />;
  if (!hasMembershipLabs && currentPage === 1 && !querySearch)
    return <MembershipVirtualLabsEmpty />;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <MembershipLabsListing
        labs={labs}
        total={totalLabs}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </div>
  );
}
