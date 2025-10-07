'use client';

import { useParams, usePathname } from 'next/navigation';
import { PlusOutlined } from '@ant-design/icons';
import lowerCase from 'es-toolkit/compat/lowerCase';
import snakeCase from 'es-toolkit/compat/snakeCase';
import Link from 'next/link';

import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { getWorkflowSegment } from '@/ui/segments/workflows/elements/helpers';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { ROOT_ROUTE } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { KebabCase } from '@/utils/type';

export function BrowseAction() {
  const pathname = usePathname();
  const breakpoint = useDefaultBreakpoint();
  const segment = getWorkflowSegment(pathname);
  const { type } = useParams<{ type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();

  const link = `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/${segment}/new/${type}`;
  const entity = getEntityByExtendedType({ type: snakeCase(type) as TExtendedEntitiesTypeDict });
  const title = `New ${lowerCase(entity?.alternateTitle ?? entity?.title)}`;

  return (
    <Button
      asChild
      rounded
      variant="success"
      size={breakpoint === 'l' ? 'md' : 'lg'}
      className="gap-10 px-4 hover:text-white!"
    >
      <Link href={link}>
        <div>{title}</div>
        <PlusOutlined />
      </Link>
    </Button>
  );
}
