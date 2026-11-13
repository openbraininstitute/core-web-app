import { isPlainObject } from '@/features/scan-config/components/utils';
import { WorkflowSeed } from '@/features/scan-config/workflow/seeding/workflow-seed';
import { collectSessionSelectionRefs } from '@/features/scan-config/workflow/workflow-session-selection';

import type { Config } from '@/features/scan-config/types';
import type { TWorkflowSeedApplyArgs } from '@/features/scan-config/workflow/seeding/types';

/**
 * Seeds a `model_selector_single` field that sits in a plain `block_single` (the e-model of a
 * validation or of an ME-model build). The generic seed only fills `initialize`'s
 * `model_identifier*` and block-dictionary entries, so it leaves these fields empty.
 */
export class BlockSingleFieldSeed extends WorkflowSeed {
  private readonly blockKey: string;
  private readonly fieldKey: string;

  constructor(blockKey: string, fieldKey: string) {
    super();
    this.blockKey = blockKey;
    this.fieldKey = fieldKey;
  }

  override applyTo({
    config,
    sessionSelection,
    resolveFromIdType,
  }: TWorkflowSeedApplyArgs): Config {
    const ref = collectSessionSelectionRefs(sessionSelection).at(0);
    const fromIdType = ref && resolveFromIdType(ref.type);
    const block = config[this.blockKey];
    if (!ref || !fromIdType || !isPlainObject(block)) return config;

    return {
      ...config,
      [this.blockKey]: { ...block, [this.fieldKey]: { type: fromIdType, id_str: ref.id } },
    };
  }
}
