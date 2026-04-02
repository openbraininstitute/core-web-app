import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportLeftSideTab, ImportMode } from './constants';
import { UploadFlowSidebar } from './upload-flow-sidebar';

vi.mock('./constants', () => ({
  ImportLeftSideTab: {
    Type: 'type',
    Options: 'options',
  },
  ImportMode: {
    Single: 'single',
    Multiple: 'multiple',
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('UploadFlowSidebar', () => {
  it('keeps single-upload type and options rows visibly hoverable and clickable', () => {
    render(
      <UploadFlowSidebar
        currentTab={ImportLeftSideTab.Type}
        hasTypeSelected
        mode={ImportMode.Single}
        typeHref="/contribute/type"
        optionsHref="/contribute/options"
        typeValueLabel="Cell Morphology"
        optionsValueLabel="Single"
        suppressUploadTabActiveStyle
      />
    );

    expect(screen.getByText('Type').closest('a')).toHaveAttribute('href', '/contribute/type');
    expect(screen.getByText('Options').closest('a')).toHaveAttribute('href', '/contribute/options');

    expect(screen.getByText('Type')).toHaveClass('group-hover:text-white!');
    expect(screen.getByText('Cell Morphology')).toHaveClass('group-hover:text-white!');
    expect(screen.getByText('Options')).toHaveClass('group-hover:text-white!');
    expect(screen.getByText('Single')).toHaveClass('group-hover:text-white!');
  });
});
