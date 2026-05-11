'use client';

import { RightOutlined } from '@ant-design/icons';
import snakeCase from 'es-toolkit/compat/snakeCase';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { upperFirst } from 'node_modules/es-toolkit/dist/string/upperFirst.mjs';

import { config } from '@/config';
import { WorkflowActivityDictValue } from '@/constants';
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
  getEntityMeta,
  getPrimaryConfigurationInput,
  getWorkflowSegment,
} from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

export function BuildWorkflowsBreadcrumb() {
  const pathname = usePathname();
  const segment = getWorkflowSegment(pathname);

  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();

  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const category = getActivity(segment)?.name;

  // when the active workflow has configurationInputs (needsBrowse), the user
  // is selecting the input entity, surface that in the breadcrumb instead of
  // the target entity
  const primaryInput = getPrimaryConfigurationInput({
    activity: WorkflowActivityDictValue.build,
    targetType: dataType,
  });
  const browseType = (primaryInput?.type as TExtendedEntitiesTypeDict | undefined) ?? dataType;

  const selectTitle = getEntityByExtendedType({ type: browseType })?.title;
  const buildTitle = getEntityMeta(dataType)?.label;
  const homeLink = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows`;
  const leftTitle = [buildTitle, category].filter(Boolean).join(' ');
  const upperLeftTitle = upperFirst(leftTitle.toLocaleLowerCase());

  return (
    <div className="px-3 pt-4 pb-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="text-primary-9 hover:text-primary-7 text-lg font-light select-none"
            >
              <Link href={homeLink}>{upperLeftTitle}</Link>
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
