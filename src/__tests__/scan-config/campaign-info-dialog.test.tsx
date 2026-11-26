import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CampaignInfoDialog } from '@/features/scan-config/components/campaign-info/dialog';

function renderDialog(initial = { campaign_name: '', campaign_description: '' }) {
  const onCancel = vi.fn();
  const onDone = vi.fn();
  render(
    <CampaignInfoDialog
      initial={initial}
      submitLabel="Generate simulation(s)"
      onCancel={onCancel}
      onDone={onDone}
    />
  );
  return {
    onCancel,
    onDone,
    name: screen.getByTestId('scan-config-campaign-info-name'),
    description: screen.getByTestId('scan-config-campaign-info-description'),
    submit: screen.getByTestId('scan-config-campaign-info-submit'),
  };
}

describe('CampaignInfoDialog', () => {
  it('opens on what the config holds, to be changed', () => {
    const { name, description, submit } = renderDialog({
      campaign_name: 'A name',
      campaign_description: 'What it is for',
    });
    expect(name).toHaveValue('A name');
    expect(description).toHaveValue('What it is for');
    expect(submit).toHaveAttribute('aria-disabled', 'false');
  });

  it('generates only once both are filled in, and hands them over trimmed', () => {
    const { name, description, submit, onDone } = renderDialog();
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(submit);
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: '  A name ' } });
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    fireEvent.change(description, { target: { value: 'What it is for\n' } });
    expect(submit).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(submit);
    expect(onDone).toHaveBeenCalledWith({
      campaign_name: 'A name',
      campaign_description: 'What it is for',
    });
  });

  it('hands what was typed to Cancel, as typed, so that it is kept', () => {
    const { name, onCancel, onDone } = renderDialog({
      campaign_name: '',
      campaign_description: 'What it is for',
    });
    fireEvent.change(name, { target: { value: 'Half a na' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledWith({
      campaign_name: 'Half a na',
      campaign_description: 'What it is for',
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('is named, and keeps the focus in while there is nothing to generate yet', () => {
    const { name, submit } = renderDialog();
    expect(screen.getByRole('dialog', { name: 'Name your campaign' })).toBeInTheDocument();
    expect(name).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(submit).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(name).toHaveFocus();
  });

  it('keeps what was typed when Escape puts it away, too', () => {
    const { description, onCancel } = renderDialog();
    fireEvent.change(description, { target: { value: 'Begun' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledWith({ campaign_name: '', campaign_description: 'Begun' });
  });
});
