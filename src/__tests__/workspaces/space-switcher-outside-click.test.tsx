import { render, screen } from '@testing-library/react';
import { Popconfirm, Select } from 'antd';
import { describe, expect, it } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/molecules/dropdown-menu';
import { isInsideContentModal } from '@/ui/segments/workspaces/space-switcher/outside-click';

import type { ReactNode } from 'react';

/** A control, open, in a content modal's dialog. */
function renderInDialog(control: ReactNode) {
  render(<div id="modal-dialog">{control}</div>);
}

describe('isInsideContentModal', () => {
  it('counts the dialog, but not its mask or the rest of the page', () => {
    render(
      <>
        <div id="modal-overlay" data-testid="mask" />
        <div id="modal-dialog">
          <button type="button">Save</button>
        </div>
        <p>Page</p>
      </>
    );
    expect(isInsideContentModal(screen.getByRole('button', { name: 'Save' }))).toBe(true);
    expect(isInsideContentModal(screen.getByTestId('mask'))).toBe(false);
    expect(isInsideContentModal(screen.getByText('Page'))).toBe(false);
    expect(isInsideContentModal(null)).toBe(false);
  });

  // each popup is portalled to <body>, outside the dialog, as the Feature Flags' selects are
  it("counts a select's options", () => {
    renderInDialog(
      <Select
        open
        options={[
          { label: 'true', value: true },
          { label: 'false', value: false },
        ]}
      />
    );
    const option = screen.getByTitle('true');
    expect(option.closest('#modal-dialog')).toBeNull();
    expect(isInsideContentModal(option)).toBe(true);
  });

  it("counts a pop-confirm's buttons", () => {
    renderInDialog(
      <Popconfirm open title="Remove this member?">
        <button type="button">Remove</button>
      </Popconfirm>
    );
    const ok = screen.getByRole('button', { name: 'OK' });
    expect(ok.closest('#modal-dialog')).toBeNull();
    expect(isInsideContentModal(ok)).toBe(true);
  });

  it("counts a menu's items, as the Credits tab's are", () => {
    renderInDialog(
      <DropdownMenu open>
        <DropdownMenuTrigger>Credits</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>History</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const item = screen.getByRole('menuitem', { name: 'History' });
    expect(item.closest('#modal-dialog')).toBeNull();
    expect(isInsideContentModal(item)).toBe(true);
  });
});
