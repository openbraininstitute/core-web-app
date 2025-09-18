'use client';

import { CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { Empty, List } from 'antd';
import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import type { EntityTypeValue } from '@/entity-configuration/domain';

import { getScientificArtifactPublicationLinks } from '@/api/entitycore/queries/general/scientific-artifact-publication-link';
import { PublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import { Card } from '@/features/entities/circuit/elements/publication-item/card';
import type { EntityCoreExtendedType } from '@/entity-configuration/domain/helpers';
import { tryCatch } from '@/api/utils';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';

import type {
  IScientificArtifactPublicationLink,
  TPublicationTypeDictionary,
} from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import type { WorkspaceContext } from '@/types/common';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';

export default function RelatedPublications({
  entity,
  extendedType,
}: {
  entity: EntityTypeValue;
  extendedType: EntityCoreExtendedType;
}) {
  const entityType = getEntityByExtendedType({ type: extendedType });
  if (!entityType) notFound();

  return (
    <Tabs defaultMessage="No related publications found">
      <Tab label="Provenance">
        <PerTypePublications entity={entity} type={PublicationTypeDictionary.EntitySource} />
      </Tab>

      <Tab label="Related artifacts provenance">
        <PerTypePublications entity={entity} type={PublicationTypeDictionary.ComponentSource} />
      </Tab>
      <Tab label="Applications">
        <PerTypePublications entity={entity} type={PublicationTypeDictionary.Application} />
      </Tab>
    </Tabs>
  );
}

function PerTypePublications({
  entity,
  type,
}: {
  entity: EntityTypeValue;
  type: TPublicationTypeDictionary;
}) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [relatedPublications, setRelatedPublications] = useState<
    IScientificArtifactPublicationLink[]
  >([]);
  const [pagination, setPagination] = useState<{
    loading: boolean;
    page: number;
    pageSize: number;
    error: string | null;
  }>({
    loading: false,
    page: 1,
    pageSize: 5,
    error: null,
  });

  useEffect(() => {
    async function getRelatedPublications() {
      setPagination((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));
      const { data: result, error } = await tryCatch(
        getScientificArtifactPublicationLinks({
          filters: {
            scientific_artifact__id: entity.id,
            publication_type: type,
            page: pagination.page,
            page_size: pagination.pageSize,
          },
          context: { virtualLabId, projectId },
        })
      );

      if (error) {
        setPagination((prev) => ({
          ...prev,
          error: error.message ?? 'An error occurred while fetching related publications',
          loading: false,
        }));
        return;
      }

      setRelatedPublications(result?.data ?? []);
      setPagination((prev) => ({
        ...prev,
        loading: false,
      }));
    }

    getRelatedPublications();
  }, [pagination.page, pagination.pageSize, type, entity.id, virtualLabId, projectId]);

  return (
    <div className="flex flex-col gap-2">
      <List
        loading={{
          indicator: <LoadingOutlined spin />,
          spinning: pagination.loading,
        }}
        pagination={{
          position: 'bottom',
          align: 'end',
          size: 'small',
          responsive: true,
          role: 'navigation',
          showQuickJumper: false,
          hideOnSinglePage: true,
          pageSize: pagination.pageSize,
          onChange: (page, pageSize) => {
            setPagination((prev) => ({
              ...prev,
              page,
              pageSize,
            }));
          },
        }}
        className="[&_.ant-pagination]:gap-1"
        rowKey={(link) => link.id}
        dataSource={relatedPublications}
        locale={{
          emptyText: (
            <div className="flex flex-col items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<p className="text-gray-500">No related publications found</p>}
              />
            </div>
          ),
        }}
        renderItem={(publication) => (
          <List.Item key={publication.id} className="cursor-default">
            <Card
              publication={publication.publication}
              scientificArtifact={publication.scientific_artifact}
            />
          </List.Item>
        )}
      />
      {pagination.error && (
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="flex w-max items-center justify-between gap-6 rounded-md bg-red-50 p-4">
            <p className="text-primary-8">{pagination.error}</p>
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
