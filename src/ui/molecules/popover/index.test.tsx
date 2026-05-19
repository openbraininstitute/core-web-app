import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../../../tests/test-utils';
import { Popover, PopoverContent, PopoverTrigger } from './index';

describe('Popover (Radix)', () => {
  it('renders content in a portal after the trigger is clicked', async () => {
    renderWithProviders(
      <Popover>
        <PopoverTrigger>Open settings</PopoverTrigger>
        <PopoverContent>
          <p>Inside popover</p>
        </PopoverContent>
      </Popover>,
      { withAntd: false, withJotai: false, withQuery: false }
    );

    expect(screen.queryByText('Inside popover')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Open settings'));

    // Radix portals the content out of the trigger subtree; screen.getBy* reaches into it.
    await waitFor(() => expect(screen.getByText('Inside popover')).toBeInTheDocument());

    // Content is rendered in a portal — not a descendant of the trigger element.
    const trigger = screen.getByText('Open settings');
    expect(trigger.contains(screen.getByText('Inside popover'))).toBe(false);
  });
});
