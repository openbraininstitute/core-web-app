import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { deriveCapabilities } from '@/admin/capabilities/derive';
import { VLAB_ADMIN_GROUP, VLAB_MAINTAINER_GROUP } from '@/admin/capabilities/registry';
import { CapabilitiesProvider, CapabilityGate } from '@/admin/shell/capability-gate';

function renderGate(groups: string[] | null) {
  return render(
    <CapabilitiesProvider value={groups && deriveCapabilities(groups)}>
      <CapabilityGate need="virtualLab.admin" fallback={<span>read only</span>}>
        <button type="button">Edit</button>
      </CapabilityGate>
    </CapabilitiesProvider>
  );
}

describe('CapabilityGate', () => {
  it('shows the action to a lab admin', () => {
    renderGate([VLAB_ADMIN_GROUP]);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });

  it('shows a maintainer the read-only fallback, with no action', () => {
    renderGate([VLAB_MAINTAINER_GROUP]);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('read only')).toBeTruthy();
  });

  it('hides the action when capabilities are unknown', () => {
    renderGate(null);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
