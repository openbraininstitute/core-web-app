'use client';

import { useParams, usePathname } from 'next/navigation';
import { RightOutlined } from '@ant-design/icons';
import snakeCase from 'lodash/snakeCase';
import Link from 'next/link';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { ROOT_ROUTE } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  getBuildTypeFromSimulateType,
  getCategoryDictItem,
  getEntityTypeWorkflowConfigurationItem,
  getWorkflowSegment,
} from '@/ui/segments/workflows/elements/helpers';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

export function SimulateWorkflowsBreadcrumb() {
  const pathname = usePathname();
  const segment = getWorkflowSegment(pathname);

  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const category = getCategoryDictItem(segment)?.name;
  const buildType = getBuildTypeFromSimulateType(dataType);
  const selectTitle = getEntityByExtendedType({ type: buildType })?.title;
  const buildTitle = getEntityTypeWorkflowConfigurationItem(buildType)?.label;
  const homeLink = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`;

  return (
    <div className="px-3 pt-4 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="text-primary-9 hover:text-primary-7 text-lg font-light select-none"
            >
              <Link href={homeLink}>
                {buildTitle} {category}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-primary-9 text-lg font-bold">
            <RightOutlined className="text-sm" />
          </BreadcrumbSeparator>
          <BreadcrumbItem className="text-primary-9 hover:text-primary-7 text-lg font-bold select-none">
            Select {selectTitle}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
