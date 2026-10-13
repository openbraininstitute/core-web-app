import { describe, expect, it } from 'vitest';

import { hasHardcodedMechanisms } from '@/features/entities/e-model/hardcoded-mechanisms';

describe('hasHardcodedMechanisms', () => {
  it('finds an e-model that ships a mechanisms file', async () => {
    await expect(hasHardcodedMechanisms('EM__117407f__bAC__14')).resolves.toBe(true);
  });

  it('is false for an e-model without one', async () => {
    await expect(hasHardcodedMechanisms('not-a-shipped-emodel')).resolves.toBe(false);
  });

  it('does not leave the mechanisms folder', async () => {
    await expect(hasHardcodedMechanisms('../../package')).resolves.toBe(false);
  });
});
