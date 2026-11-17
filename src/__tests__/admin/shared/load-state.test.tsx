import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Loaded } from '@/admin/shared/load-state';
import { ApiError } from '@/api/error';

function renderLoaded(data: string | undefined, error: unknown) {
  render(
    <Loaded query={{ data, error }} what="this lab">
      {(name) => <span>{name}</span>}
    </Loaded>
  );
}

describe('Loaded', () => {
  it('keeps the loaded data when a refetch fails', () => {
    renderLoaded('Lab A', new ApiError('Bad gateway', { status: 502 }));
    expect(screen.getByText('Lab A')).toBeTruthy();
  });

  it('hides the loaded data once the account can no longer read it', () => {
    renderLoaded('Lab A', new ApiError('Forbidden', { status: 403 }));
    expect(screen.queryByText('Lab A')).toBeNull();
    expect(screen.getByText("Your account can't read this lab.")).toBeTruthy();
  });
});
