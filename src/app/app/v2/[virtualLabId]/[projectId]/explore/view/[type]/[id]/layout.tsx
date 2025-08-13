import { ReactNode } from 'react';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '@/ui/molecules/breadcrumb';
import { basePath } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

interface Params {
  virtualLabId: string;
  projectId: string;
  id: string;
  type: string;
}

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<Params>;
}) {
  const { virtualLabId, projectId, type, id } = await params;

  if (!type || !id) notFound();

  const entityType = getEntityByExtendedType({ type: type as TExtendedEntitiesTypeDict });
  if (!entityType) notFound();

  const fetchEntity = entityType.api.query.one;

  if (!fetchEntity) throw Error(`No fetch one function defined for type ${entityType}`);

  const entity = await fetchEntity({ id, context: { virtualLabId, projectId } });
  if (!entity) notFound();

  return (
    <div className="ml-5 flex h-full rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">
      <div className="basis-1/5">
        <div className="flex flex-wrap gap-3">
          <Breadcrumb>
            <NextLink href={`${basePath}/app/v2/${virtualLabId}/${projectId}/explore`}>
              Explore
            </NextLink>
          </Breadcrumb>
          <Breadcrumb>
            <NextLink
              href={`${basePath}/app/v2/${virtualLabId}/${projectId}/explore/browse/${type}`}
            >
              {type}
            </NextLink>
          </Breadcrumb>
          <Breadcrumb showChevron={false}>{entity.name}</Breadcrumb>
        </div>
      </div>
      <div className="grow basis-4/5">{children}</div>
    </div>
  );
}
