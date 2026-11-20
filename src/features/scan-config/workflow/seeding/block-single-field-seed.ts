import { isPlainObject } from '@/features/scan-config/components/utils';
import { WorkflowSeed } from '@/features/scan-config/workflow/seeding/workflow-seed';
import { collectSessionSelectionRefs } from '@/features/scan-config/workflow/workflow-session-selection';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Config } from '@/features/scan-config/types';
import type { TWorkflowSeedApplyArgs } from '@/features/scan-config/workflow/seeding/types';

/**
 * Seeds a `model_selector_single` field that sits in a plain `block_single` (the e-model of a
 * validation, or the e-model/morphology of an ME-model build). The generic seed only fills
 * `initialize`'s `model_identifier*` and block-dictionary entries, so it leaves these fields
 * empty. `fieldKeyByType` picks the field from the type of the entity the launcher came from, so
 * one workflow can be seeded from any of several source types.
 */
export class BlockSingleFieldSeed extends WorkflowSeed {
  private readonly blockKey: string;
  private readonly fieldKeyByType: Partial<Record<TExtendedEntitiesTypeDict, string>>;

  constructor(
    blockKey: string,
    fieldKeyByType: Partial<Record<TExtendedEntitiesTypeDict, string>>
  ) {
    super();
    this.blockKey = blockKey;
    this.fieldKeyByType = fieldKeyByType;
  }

  override applyTo({
    config,
    sessionSelection,
    resolveFromIdType,
  }: TWorkflowSeedApplyArgs): Config {
    const ref = collectSessionSelectionRefs(sessionSelection).at(0);
    const fieldKey = ref && this.fieldKeyByType[ref.type];
    const fromIdType = ref && resolveFromIdType(ref.type);
    const block = config[this.blockKey];
    if (!ref || !fieldKey || !fromIdType || !isPlainObject(block)) return config;

    return {
      ...config,
      [this.blockKey]: { ...block, [fieldKey]: { type: fromIdType, id_str: ref.id } },
    };
  }
}
