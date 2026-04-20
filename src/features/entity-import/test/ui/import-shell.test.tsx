import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ImportRunPhase } from '@/features/entity-import/core/contracts';
import { ImportShell } from '@/features/entity-import/ui/import-shell';

vi.mock('@/features/entity-import/ui/elements/header', () => ({
  ImportHeader: () => <div data-testid="import-header" />,
}));

vi.mock('@/features/entity-import/ui/import-table', () => ({
  ImportTable: () => <div data-testid="import-table" />,
}));

vi.mock('@/features/entity-import/ui/notification-stack', () => ({
  NotificationStack: () => <div data-testid="notification-stack" />,
}));

vi.mock('@/features/entity-import/ui/validator-panel', () => ({
  ValidatorPanel: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="validator-panel-state">{collapsed ? 'collapsed' : 'expanded'}</div>
  ),
}));

describe('ImportShell', () => {
  it('renders the validator panel expanded by default', () => {
    render(
      <ImportShell
        title="Test import"
        adapter={{} as never}
        context={{} as never}
        session={{ notifications: [] } as never}
        actions={{ onDismissFeatureNotification: vi.fn() } as never}
        isSubmitting={false}
        importRun={{ phase: ImportRunPhase.Idle } as never}
        validatorPreview={{} as never}
        csvUploadPhase={'idle'}
        csvRowValidationProgress={{ active: false, totalRowCount: 0, completedRowCount: 0 }}
        csvUploadNotifications={[]}
        bulkFileUploadAction={null}
        validatorSuggestions={{} as never}
        fieldStatusMap={{}}
        rowsSummaryStatus={'neutral' as never}
        onClose={vi.fn()}
        onDismissCsvUploadNotifications={vi.fn()}
        onDownloadCurrentCsv={vi.fn()}
        onDownloadGuideTemplate={vi.fn()}
        onUploadCsvFile={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByTestId('validator-panel-state')).toHaveTextContent('expanded');
  });
});
