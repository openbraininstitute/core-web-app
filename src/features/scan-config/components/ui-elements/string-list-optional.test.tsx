import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StringListOptional } from '@/features/scan-config/components/ui-elements/string-list-optional';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

describe('StringListOptional', () => {
  it('tags the DOM with the string_list_optional block element (not string_list_input)', () => {
    const { container } = render(<StringListOptional value={['a']} onChange={() => {}} />);
    const el = container.querySelector('[data-scan-config-block-element]');
    expect(el?.getAttribute('data-scan-config-block-element')).toBe(
      ScanConfigUIElementDict.StringListOptional
    );
  });

  it('renders the plain read-only view (no add input, no delete buttons) when disabled', () => {
    render(<StringListOptional value={['a', 'b']} disabled onChange={() => {}} />);
    // Values are shown, but the editing controls are not.
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.queryByTestId('scan-config-control')).toBeNull();
    expect(screen.queryByTestId('scan-config-string-list-add')).toBeNull();
    expect(screen.queryByTestId('scan-config-string-list-remove')).toBeNull();
  });

  it('shows editing controls when not disabled', () => {
    render(<StringListOptional value={['a']} onChange={() => {}} />);
    expect(screen.getByTestId('scan-config-control')).toBeInTheDocument();
    expect(screen.getByTestId('scan-config-string-list-remove')).toBeInTheDocument();
  });
});
