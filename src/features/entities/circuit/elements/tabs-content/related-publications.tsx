import { CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Empty, List } from 'antd';
import { useState } from 'react';

import { getScientificArtifactPublicationLinks } from '@/api/entitycore/queries/general/scientific-artifact-publication-link';
import { PublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import { Card } from '@/features/entities/circuit/elements/publication-item/card';
import Tabs, { Tab } from '@/ui/molecules/tabbed-page';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TPublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

function PerTypePublications({
  circuit,
  type,
}: {
  circuit: ICircuit;
  type: TPublicationTypeDictionary;
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
        scientific_artifact__id: circuit.id,
        publication_type: type,
        page: pagination.page,
        page_size: pagination.pageSize,
      },
    }),
    queryFn: async () => {
      return await getScientificArtifactPublicationLinks({
        filters: {
          scientific_artifact__id: circuit.id,
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
          position: 'bottom',
          align: 'end',
          size: 'small',
          responsive: true,
          role: 'navigation',
          showQuickJumper: false,
          hideOnSinglePage: true,
          pageSize: pagination.pageSize,
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
                description={<p className="text-gray-500">No related publications found</p>}
              />
            </div>
          ),
        }}
        renderItem={(publication) => (
          <List.Item key={publication.id}>
            <Card
              publication={publication.publication}
              scientificArtifact={publication.scientific_artifact}
            />
          </List.Item>
        )}
      />
      {isError && (
        <div className="my-5 flex flex-col items-center justify-center">
          <div className="flex w-max items-center justify-between gap-6 rounded-md bg-red-50 p-4">
            <p className="text-primary-8">{error.message}</p>
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

export default function RelatedPublications({ circuit }: Props) {
  return (
    <Tabs defaultMessage="No related publications found">
      <Tab label="Provenance">
        <PerTypePublications circuit={circuit} type={PublicationTypeDictionary.EntitySource} />
      </Tab>

      <Tab label="Related artifacts provenance">
        <PerTypePublications circuit={circuit} type={PublicationTypeDictionary.ComponentSource} />
      </Tab>
      <Tab label="Applications">
        <PerTypePublications circuit={circuit} type={PublicationTypeDictionary.Application} />
      </Tab>
    </Tabs>
  );
}
