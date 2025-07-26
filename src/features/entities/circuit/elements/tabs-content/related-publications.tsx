import { CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
import { Collapse, Empty, List } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import type { CollapseProps } from 'antd';

import { getScientificArtifactPublicationLinks } from '@/api/entitycore/queries/general/scientific-artifact-publication-link';
import { PublicationTypeDictionary } from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
import { Card } from '@/features/entities/circuit/elements/publication-item/card';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type {
  IScientificArtifactPublicationLink,
  TPublicationTypeDictionary,
} from '@/api/entitycore/types/entities/scientific-artifact-publication-link';
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
            scientific_artifact__id: circuit.id,
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
  }, [pagination.page, pagination.pageSize, type, circuit.id, virtualLabId, projectId]);

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
          <List.Item key={publication.id}>
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

export default function RelatedPublications({ circuit }: Props) {
  const items: CollapseProps['items'] = [
    {
      key: 'entity_source',
      label: 'Circuit provenance',
      children: (
        <PerTypePublications circuit={circuit} type={PublicationTypeDictionary.EntitySource} />
      ),
    },
    {
      key: 'component_source',
      label: 'Related artifacts provenance',
      children: (
        <PerTypePublications circuit={circuit} type={PublicationTypeDictionary.ComponentSource} />
      ),
    },
    {
      key: 'application',
      label: 'Applications',
      children: (
        <PerTypePublications circuit={circuit} type={PublicationTypeDictionary.Application} />
      ),
    },
  ];

  return (
    <div className="mt-5">
      <Collapse
        ghost
        bordered={false}
        items={items}
        collapsible="header"
        defaultActiveKey={['entity_source']}
        expandIcon={() => null}
        className={classNames(
          '[&_.ant-collapse-item]:mb-2',
          '[&_.ant-collapse-header]:bg-primary-8 [&_.ant-collapse-header]:border-none [&_.ant-collapse-header]:text-white!',
          '[&_.ant-collapse-header]:rounded-none! [&_.ant-collapse-header]:text-lg [&_.ant-collapse-header]:font-semibold'
        )}
      />
    </div>
  );
}
