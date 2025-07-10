'use client';

import { ConfigProvider, Empty, Table } from 'antd';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { useAtom } from 'jotai';
import Link from 'next/link';

import { LinkIcon, statusToColorMap, statusToIcon } from '@/features/activity-view/elements';
import { pageNumberAtom, pageSizeAtom } from '@/state/explore-section/list-view-atoms';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { useActivityData } from '@/features/activity-view/context';
import { useTabs } from '@/components/detail-view-tabs';
import { resolveDataKey } from '@/utils/key-builder';
import { classNames } from '@/util/utils';

import type { ActivityColumn, AllowedEntityTypes } from '@/features/activity-view/types';
import type { WorkspaceContext } from '@/types/common';

const columns: ActivityColumn[] = [
  {
    title: 'Scale',
    dataIndex: 'scale',
    key: 'scale',
    render: (text, record) => (
      <span className={statusToColorMap[record.status] || statusToColorMap.default}>{text}</span>
    ),
  },
  {
    title: 'Use case',
    dataIndex: 'usecase',
    key: 'usecase',
    render: (text, record) => (
      <span className={statusToColorMap[record.status] || statusToColorMap.default}>{text}</span>
    ),
  },
  {
    title: 'Activity',
    dataIndex: 'activity',
    key: 'activity',
    render: (text, record) => (
      <span className={statusToColorMap[record.status] || statusToColorMap.default}>{text}</span>
    ),
  },
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text, record) => (
      <span className={statusToColorMap[record.status] || statusToColorMap.default}>{text}</span>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (_, record) => {
      const icon = statusToIcon[record.status] || statusToIcon.default;
      return (
        <span
          className={classNames(
            'flex items-center capitalize',
            statusToColorMap[record.status] || statusToColorMap.default
          )}
        >
          {icon}
          {record.status}
        </span>
      );
    },
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    render: (_, record) => {
      return (
        <span className={statusToColorMap[record.status] || statusToColorMap.default}>
          {record.date}
        </span>
      );
    },
  },
  {
    title: 'Actions',
    dataIndex: 'linkUrl',
    key: 'linkUrl',
    render: (_, record) => {
      return (
        <Link href={record.linkUrl} aria-label={record.name}>
          {LinkIcon}
        </Link>
      );
    },
  },
];

export const defaultTabKey = 'type';
export const tabsConfigItems: Array<{ key: AllowedEntityTypes; title: string }> = [
  {
    key: 'memodel',
    title: 'Memodel',
  },
  {
    key: 'single_neuron_synaptome',
    title: 'Single Neuron Synaptome',
  },
  {
    key: 'single_neuron_simulation',
    title: 'Single Neuron Simulation',
  },
  {
    key: 'single_neuron_synaptome_simulation',
    title: 'Single Neuron Synaptome Simulation',
  },
];

export default function ActivityTable() {
  const { activeTab: type } = useTabs<AllowedEntityTypes>({
    tabsConfig: tabsConfigItems,
    tabKey: defaultTabKey,
  });
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const key = resolveDataKey({ projectId, section: 'activity', suffix: type ?? undefined });
  const [pageSize, setPageSize] = useAtom(
    useMemo(() => pageSizeAtom({ key, defaultSize: 10 }), [key])
  );
  const [page, setPageNumber] = useAtom(pageNumberAtom(key));

  const { data, total, isLoading } = useActivityData({
    virtualLabId,
    projectId,
    type,
    key,
  });

  if (!type) {
    return (
      <div className="flex h-full items-center justify-center">
        <div>No selected type </div>
      </div>
    );
  }

  if (isLoading) return null;
  return (
    <div className="flex h-full w-full flex-col">
      <ConfigProvider
        theme={{
          hashed: false,
          components: {
            Table: {
              headerColor: '#69C0FF',
              headerSplitColor: 'transparent',
              bodySortBg: 'rgb(226, 25, 25)',
              colorBgContainer: '#002766',
              colorText: '#FFFFFF',
              borderColor: '#1890FF',
              cellPaddingInline: 0,
            },
          },
        }}
      >
        <Table
          className={classNames(
            '[&_.ant-table-tbody>tr:last-child>td]:border-b-0',
            '[&_.ant-table-thead>tr>th]:border-b-0',
            '[&_.ant-pagination-item-link]:text-white!',
            '[&_.ant-pagination-simple-pager]:text-white!',
            '[&_.ant-pagination-simple-pager_input]:text-primary-8!'
          )}
          loading={isLoading}
          dataSource={data}
          columns={columns}
          pagination={{
            pageSize,
            total,
            defaultCurrent: 1,
            current: page,
            hideOnSinglePage: true,
            align: 'end',
            simple: true,
            size: 'default',
            responsive: true,
            role: 'button',
            position: ['topRight'],
            onChange: (_page, _pageSize) => {
              setPageNumber(_page);
              setPageSize(_pageSize);
            },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span className="text-white">
                    No activity found for <strong>{getEntityByCoreType({ type })?.title}</strong>{' '}
                    yet.
                  </span>
                }
              />
            ),
          }}
        />
      </ConfigProvider>
    </div>
  );
}
