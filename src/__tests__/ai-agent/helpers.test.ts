import { describe, expect, it } from 'vitest';

import { isChatIdle } from '@/services/ai-agent/helpers';

describe('isChatIdle', () => {
  it('is busy while a reply is in flight', () => {
    expect(isChatIdle('submitted')).toBe(false);
    expect(isChatIdle('streaming')).toBe(false);
  });

  it('is idle when ready or after a failed reply', () => {
    expect(isChatIdle('ready')).toBe(true);
    expect(isChatIdle('error')).toBe(true);
  });
});
