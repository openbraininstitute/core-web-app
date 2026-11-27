import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompatibilityNotice } from '@/features/scan-config/components/memodel-compatibility/compatibility-notice';
import { messages } from '@/i18n/en/me-model';

import type { CompatibilityState } from '@/features/scan-config/components/memodel-compatibility/compatibility-state';

describe('CompatibilityNotice inside the configuration form', () => {
  it('retries the check without submitting the form', () => {
    const onRetry = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <CompatibilityNotice
          state={{ kind: 'check_failed', detail: 'timeout' } as CompatibilityState}
          onRetry={onRetry}
        />
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: messages.CompatibilityRetry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
