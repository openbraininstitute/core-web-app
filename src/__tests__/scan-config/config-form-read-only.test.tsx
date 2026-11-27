import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useLowCredits = vi.fn(() => ({ reportError: () => false, creditsModal: null }));

vi.mock('@/features/low-credits/use-low-credits', () => ({
  useLowCredits: () => useLowCredits(),
}));

import { ConfigForm } from '@/features/scan-config/template/columns';

import type { ScanConfigTemplateProps } from '@/features/scan-config/template/types';
import type { ScanConfigTemplateState } from '@/features/scan-config/template/use-scan-config-template';

describe('ConfigForm', () => {
  it('draws no form and mounts no generation hooks in a read-only view', () => {
    render(
      <ConfigForm
        props={{ readOnly: true } as ScanConfigTemplateProps}
        state={{} as ScanConfigTemplateState}
        className="contents"
      >
        <span>column</span>
      </ConfigForm>
    );

    expect(screen.getByText('column').parentElement).toHaveClass('contents');
    expect(screen.queryByRole('form')).toBeNull();
    expect(useLowCredits).not.toHaveBeenCalled();
  });
});
