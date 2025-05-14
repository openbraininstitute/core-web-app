import { EntityTypeEnum } from '@/api/entitycore/types/entity-type';
import { WorkspaceContext } from '@/types/common';

export function resolveDataKey({
  ctx,
  type,
  scope,
  extra,
}: {
  ctx?: WorkspaceContext;
  type: EntityTypeEnum;
  scope: string;
  extra?: string;
}) {
  let base = `${scope}/${type}`;
  if (extra) {
    base = `${base}/${extra}`;
  }
  if (ctx) {
    return `${ctx.virtualLabId}/${ctx.projectId}/${base}`;
  }
  return base;
}
