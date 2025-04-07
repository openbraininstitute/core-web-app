'use client';

import { List } from 'antd';
import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { VirtualLab } from '@/api/virtual-lab-svc/queries/types';
import CardItem from '@/components/VirtualLab/item/vlab-item';

type Props = {
  labs?: Array<VirtualLab>;
  total: number;
  currentPage: number;
  pageSize: number;
};

export default function MembershipLabsListing({ labs, total, currentPage, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const handlePageChange = (page: number, size: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      params.set('size', size.toString());
      const queryString = params.toString();
      router.push(`${pathname}?${queryString}`);
    });
  };

  return (
    <List<VirtualLab>
      loading={pending}
      dataSource={labs}
      renderItem={(item) => (
        <CardItem
          key={item.id}
          id={item.id}
          name={item.name}
          lastUpdate={item.created_at}
          projectCount={item.projects_count}
          memberCount={item.members_count}
        />
      )}
      pagination={{
        total,
        pageSize,
        hideOnSinglePage: true,
        current: currentPage,
        onChange: handlePageChange,
        className:
          '[&_li_button]:!text-white [&_li_a]:!text-white [&_li.ant-pagination-item-active_a]:!text-primary-8',
      }}
    />
  );
}
