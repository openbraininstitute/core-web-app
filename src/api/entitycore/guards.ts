import type { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

export function hasAssets(
  obj: EntityCoreObjectTypes
): obj is EntityCoreObjectTypes & EntityCoreBaseAsset {
  return 'assets' in obj && (obj.assets === null || Array.isArray(obj.assets));
}
