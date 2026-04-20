'use client';

import { RightOutlined } from '@ant-design/icons';
import capitalize from 'es-toolkit/compat/capitalize';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

import { convertEntitySlugToExtendedType } from '@/api/entitycore/utils';
import { config } from '@/config';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import {
  getActivity,
  getBaseModelType,
  getEntityMeta,
  getWorkflowSegment,
} from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceSection } from '@/constants';
import type { KebabCase } from '@/utils/type';

type Props = {
  section: TWorkspaceSection;
};

export function SimulateWorkflowsBreadcrumb({ section }: Props) {
  const pathname = usePathname();
  const segment = getWorkflowSegment(pathname);

  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();

  const dataType = convertEntitySlugToExtendedType({ type });
  const category = getActivity(segment)?.name;

  const baseType = getBaseModelType({ type: dataType, section });
  const selectTitle = getEntityByExtendedType({ type: baseType })?.title;
  const baseTitle = getEntityMeta(baseType)?.label;

  const homeLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`;

  return (
    <div className="px-3 pt-4 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="text-primary-9 hover:text-primary-7 text-lg font-light select-none"
            >
              <Link href={homeLink}>{capitalize(`${baseTitle} ${category}`)}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-primary-9 text-lg font-bold">
            <RightOutlined className="text-sm" />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="text-primary-9 hover:text-primary-7 text-lg font-bold select-none cursor-pointer">
            {capitalize(`Select ${selectTitle}`)}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
