import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Container as AiContainer } from '@/ui/segments/ai/container';
import { SpaceManagerContainer } from '@/ui/segments/workspaces/space-manager';
import {
  makeTriggerWorkspaceConfigurationClickEvent,
  WorkspaceActions,
} from '@/ui/segments/workspaces/space-manager/event';

// set by the mock factories, which run only when the module is first imported
const loaded = vi.hoisted(() => ({ aiAssistant: false, modal: false }));

vi.mock('@/features/ai-assistant', () => {
  loaded.aiAssistant = true;
  return { default: () => <div data-testid="ai-assistant-stub" /> };
});

vi.mock('@/features/feature-flags', () => ({
  aiButtonFlag: { key: 'aiButton' },
  useFlag: () => false,
}));

vi.mock('@/ui/segments/workspaces/space-manager/modal', () => {
  loaded.modal = true;
  return { WorkspaceManagerModal: () => <div data-testid="workspace-manager-modal-stub" /> };
});

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab-1', projectId: 'project-1' }),
}));

describe('lazy-loaded layout panels', () => {
  it('loads the AI assistant when the collapsed panel is expanded', async () => {
    render(<AiContainer />);
    expect(loaded.aiAssistant).toBe(false);
    expect(screen.queryByTestId('ai-assistant-stub')).toBeNull();

    fireEvent.click(screen.getByTestId('ai-assistant-open-button'));

    expect(await screen.findByTestId('ai-assistant-stub')).toBeDefined();
  });

  it('loads the workspace manager modal when its open event fires', async () => {
    render(<SpaceManagerContainer />);
    expect(loaded.modal).toBe(false);
    expect(screen.queryByTestId('workspace-manager-modal-stub')).toBeNull();

    act(() => {
      makeTriggerWorkspaceConfigurationClickEvent({
        on: true,
        type: WorkspaceActions.ProfileSettings,
        data: {},
      });
    });

    expect(await screen.findByTestId('workspace-manager-modal-stub')).toBeDefined();
  });
});
