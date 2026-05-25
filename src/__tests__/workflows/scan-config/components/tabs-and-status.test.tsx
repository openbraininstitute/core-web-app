import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { StatusBadge } from '@/features/scan-config/components/shared/status-badge';
import TabsSelector from '@/features/scan-config/components/tabs-selector';
import {
  ScanConfigActivity,
  SimulateScanConfigTabs,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

describe('scan-config components', () => {
  it('switches to the simulate results tab only when results are enabled', () => {
    const setTab = vi.fn();
    const tab: TScanConfigTabs = {
      id: SimulateScanConfigTabs.configuration,
      __activity: ScanConfigActivity.Simulate,
    };

    render(
      <TabsSelector
        activity={ScanConfigActivity.Simulate}
        tab={tab}
        setTab={setTab}
        disableResultsTab={false}
        disableConfigurationTab={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: SimulateScanConfigTabs.simulations }));

    expect(setTab).toHaveBeenCalledWith({
      id: SimulateScanConfigTabs.simulations,
      __activity: ScanConfigActivity.Simulate,
    });
  });

  it('keeps disabled results tabs non-interactive', () => {
    const setTab = vi.fn();

    render(
      <TabsSelector
        activity={ScanConfigActivity.Simulate}
        tab={{
          id: SimulateScanConfigTabs.configuration,
          __activity: ScanConfigActivity.Simulate,
        }}
        setTab={setTab}
        disableResultsTab
        disableConfigurationTab={false}
      />
    );

    const resultsTab = screen.getByRole('button', { name: SimulateScanConfigTabs.simulations });
    fireEvent.click(resultsTab);

    expect(resultsTab).toBeDisabled();
    expect(setTab).not.toHaveBeenCalled();
  });

  it('renders status text, fallback status, and pending spinner accessibly', () => {
    const { rerender, container } = render(<StatusBadge status={ActivityStatus.PENDING} />);

    expect(screen.getByText(ActivityStatus.PENDING)).toBeInTheDocument();
    expect(container.querySelector('.anticon-loading')).toBeInTheDocument();

    rerender(<StatusBadge />);

    expect(screen.getByText('created')).toBeInTheDocument();
    expect(container.querySelector('.anticon-loading')).not.toBeInTheDocument();
  });
});
