import { describe, expect, it } from 'vitest';

import { errorReason } from '@/features/scan-config/components/generate-config-button';

const DEPRECATION =
  'AllNeurons is deprecated and should not be used. Please use an alternative neuron set instead.';

describe('errorReason', () => {
  it("reads FastAPI's HTTPException shape", () => {
    expect(errorReason({ detail: DEPRECATION })).toBe(DEPRECATION);
  });

  it('reads the obi-one error envelope, where the reason is in details[0].msg', () => {
    // What /generated/* returns for a config that is valid but not runnable.
    expect(
      errorReason({
        error_code: 'INVALID_REQUEST',
        message: DEPRECATION,
        details: [{ msg: DEPRECATION }],
      })
    ).toBe(DEPRECATION);
  });

  it('prefers details[0].msg over a generic top-level message', () => {
    // Request-validation failures set message to "Validation error"; the useful text is in details.
    const specific = "Block 'does_not_exist' not found in 'neuron_sets'.";
    expect(
      errorReason({
        error_code: 'INVALID_REQUEST',
        message: 'Validation error',
        details: [{ msg: specific }],
      })
    ).toBe(specific);
  });

  it('falls back to the top-level message when there are no details', () => {
    expect(errorReason({ message: DEPRECATION, details: null })).toBe(DEPRECATION);
  });

  it('does not throw on an empty details array', () => {
    // `details?.[0].msg` used to raise a TypeError here rather than showing anything.
    expect(errorReason({ details: [] })).toBe('Unknown error');
  });

  it('handles bodies that carry no recognisable reason', () => {
    expect(errorReason({})).toBe('Unknown error');
    expect(errorReason(null)).toBe('Unknown error');
  });
});
