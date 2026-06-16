import { CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Empty, List } from 'antd';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { getScientificArtifactPublicationLinks } from '@/api/entitycore/queries/general/scientific-artifact-publication-link';
import { type TViewVariant, ViewVariant } from '@/constants';
import { detailViewValueClass } from '@/ui/segments/detail-view/variant-styles';
import { Card } from '@/ui/segments/explore/circuit/elements/publication-item/card';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { TPublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { WorkspaceContext } from '@/types/common';

export function PerTypePublications({
  entity,
  type,
  variant = ViewVariant.Light,
}: {
  entity: TRetrieveEntityOutput;
  type: TPublicationTypeDictionary;
  variant?: TViewVariant;
}) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [pagination, setPagination] = useState<{
    page: number;
    pageSize: number;
  }>({
    page: 1,
    pageSize: 5,
  });

  const {
    isLoading,
    error,
    isError,
    data: result,
  } = useQuery({
    queryKey: keyBuilder.scientificArtifactPublicationLinks({
      context: { virtualLabId, projectId },
      props: {
        scientific_artifact__id: entity.id,
        publication_type: type,
        page: pagination.page,
        page_size: pagination.pageSize,
      },
    }),
    queryFn: async () => {
      return await getScientificArtifactPublicationLinks({
        filters: {
          scientific_artifact__id: entity.id,
          publication_type: type,
          page: pagination.page,
          page_size: pagination.pageSize,
        },
        context: { virtualLabId, projectId },
      });
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <List
        loading={{
          indicator: <LoadingOutlined spin />,
          spinning: isLoading,
        }}
        pagination={{
          position: 'both',
          align: 'end',
          size: 'small',
          responsive: true,
          role: 'navigation',
          showQuickJumper: false,
          hideOnSinglePage: true,
          pageSize: pagination.pageSize,
          total: result?.pagination.total_items ?? pagination.pageSize,
          className: cn(
            '[&_.ant-pagination-item-link]:text-white',
            '[&_.ant-pagination-item]:rounded-full!',
            '[&_.ant-pagination-item-active]:bg-primary-9',
            '[&_.ant-pagination-item-active]:text-white',
            '[&_.ant-pagination-item-active]:border-primary-9',
            '[&_.ant-pagination-item-active]:border-primary-9',
            '[&_.ant-pagination-prev_.ant-pagination-item-link]:text-white!',
            '[&_.ant-pagination-prev_.ant-pagination-disabled_.ant-pagination-item-link]:text-gray-100!',
            '[&_.ant-pagination-next_.ant-pagination-disabled_.ant-pagination-item-link]:text-gray-100!',
            '[&_.ant-pagination-next_.ant-pagination-item-link]:text-white!'
          ),
          onChange: (page, pageSize) => {
            setPagination(() => ({
              page,
              pageSize,
            }));
          },
        }}
        className="[&_.ant-pagination]:gap-1"
        rowKey={(link) => link.id}
        dataSource={result?.data ?? []}
        locale={{
          emptyText: (
            <div className="flex flex-col items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <p
                    className={variant === ViewVariant.Default ? 'text-primary-3' : 'text-gray-500'}
                  >
                    No related publications found
                  </p>
                }
              />
            </div>
          ),
        }}
        renderItem={(publication) => (
          <List.Item key={publication.id} className="border-none! px-0! py-2!">
            <Card
              publication={publication.publication}
              scientificArtifact={publication.scientific_artifact}
              className="w-full"
            />
          </List.Item>
        )}
      />
      {isError && (
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="flex w-max items-center justify-between gap-6 rounded-md bg-red-50 p-4">
            <p className={detailViewValueClass(variant)}>{error.message}</p>
            <CloseCircleTwoTone
              twoToneColor="#ff4d4f"
              className="text-md cursor-pointer hover:scale-110"
              onClick={() => setPagination((prev) => ({ ...prev, error: null }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
