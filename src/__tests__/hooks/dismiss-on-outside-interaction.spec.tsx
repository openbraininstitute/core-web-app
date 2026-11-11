import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDismissOnOutsideInteraction } from '@/hooks/use-dismiss-on-outside-interaction';

function Harness({
  enabled = true,
  onDismiss,
  onEscape,
}: {
  enabled?: boolean;
  onDismiss: () => void;
  onEscape?: () => void;
}) {
  const ref = useDismissOnOutsideInteraction<HTMLDivElement>({
    enabled,
    onDismiss,
    onEscape,
    ignoreSelector: '.ag-row, [data-testid="data-grid-pagination"]',
  });
  return (
    <div>
      <div ref={ref} data-dismissable="" data-testid="panel">
        <button type="button">inside</button>
      </div>
      <button type="button">outside</button>
      <div className="ag-row">
        <span>row</span>
      </div>
      <div data-testid="data-grid-pagination">
        <span>page 2</span>
      </div>
      <div data-radix-popper-content-wrapper="">
        <div role="listbox">
          <span>50 / page</span>
        </div>
      </div>
      <div role="dialog">
        <span>dialog</span>
      </div>
    </div>
  );
}

describe('useDismissOnOutsideInteraction', () => {
  it('dismisses on a click outside the panel', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks inside the panel', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByText('inside'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('ignores clicks on grid rows, the pager and overlays', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByText('row'));
    fireEvent.mouseDown(screen.getByText('page 2'));
    fireEvent.mouseDown(screen.getByText('50 / page'));
    fireEvent.mouseDown(screen.getByText('dialog'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on Escape', () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', () => {
    const onDismiss = vi.fn();
    render(<Harness enabled={false} onDismiss={onDismiss} />);
    fireEvent.mouseDown(screen.getByText('outside'));
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('uses onEscape instead of onDismiss for Esc when given', () => {
    const onDismiss = vi.fn();
    const onEscape = vi.fn();
    render(<Harness onDismiss={onDismiss} onEscape={onEscape} />);
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('leaves Esc to a text field on the page, but not to one inside a panel', () => {
    const onDismiss = vi.fn();
    render(
      <>
        <Harness onDismiss={onDismiss} />
        <input aria-label="grid search" />
        <div data-dismissable="">
          <textarea aria-label="chat" />
        </div>
      </>
    );
    const search = screen.getByLabelText('grid search');
    search.focus();
    fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' });
    expect(onDismiss).not.toHaveBeenCalled();

    const chat = screen.getByLabelText('chat');
    chat.focus();
    fireEvent.keyDown(chat, { key: 'Escape', code: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('reacts to Esc only when there is no onDismiss', () => {
    const onEscape = vi.fn();
    function EscOnly() {
      const ref = useDismissOnOutsideInteraction<HTMLDivElement>({ enabled: true, onEscape });
      return (
        <>
          <div ref={ref} data-dismissable="" />
          <button type="button">elsewhere</button>
        </>
      );
    }
    render(<EscOnly />);
    fireEvent.mouseDown(screen.getByText('elsewhere'));
    expect(onEscape).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('ignores clicks on the onboarding tour but not on its app wrappers', () => {
    const onDismiss = vi.fn();
    render(
      <div data-name="nextstep-wrapper">
        <div data-name="nextstep-site">
          <Harness onDismiss={onDismiss} />
        </div>
        <div data-name="nextstep-card">
          <button type="button">next step</button>
        </div>
      </div>
    );
    fireEvent.mouseDown(screen.getByText('next step'));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss on clicks inside another dismissable element', () => {
    const onDismiss = vi.fn();
    render(
      <>
        <Harness onDismiss={onDismiss} />
        <div data-dismissable="">
          <button type="button">other panel</button>
        </div>
      </>
    );
    fireEvent.mouseDown(screen.getByText('other panel'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('handles Esc while focus is in another panel that does not handle it', () => {
    const onDismiss = vi.fn();
    render(
      <>
        <Harness onDismiss={onDismiss} />
        <div data-dismissable="">
          <button type="button">other panel</button>
        </div>
      </>
    );
    screen.getByText('other panel').focus();
    fireEvent.keyDown(screen.getByText('other panel'), { key: 'Escape', code: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('treats a marked wrapper around the element as part of it', () => {
    const onEscape = vi.fn();
    function Wrapped() {
      const ref = useDismissOnOutsideInteraction<HTMLDivElement>({
        enabled: true,
        onEscape,
      });
      return (
        <div data-dismissable="">
          <div ref={ref}>
            <button type="button">wrapped</button>
          </div>
        </div>
      );
    }
    render(<Wrapped />);
    screen.getByText('wrapped').focus();
    fireEvent.keyDown(screen.getByText('wrapped'), { key: 'Escape', code: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('closes only the most recently opened element on Esc', () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const { rerender } = render(<Harness onDismiss={closeFirst} />);
    rerender(
      <>
        <Harness onDismiss={closeFirst} />
        <Harness onDismiss={closeSecond} />
      </>
    );
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(closeSecond).toHaveBeenCalledTimes(1);
    expect(closeFirst).not.toHaveBeenCalled();
  });

  it('lets the focused element handle Esc even when it opened first', () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const { rerender } = render(<Harness onDismiss={closeFirst} />);
    rerender(
      <>
        <Harness onDismiss={closeFirst} />
        <Harness onDismiss={closeSecond} />
      </>
    );
    const [firstInside] = screen.getAllByText('inside');
    firstInside.focus();
    fireEvent.keyDown(firstInside, { key: 'Escape', code: 'Escape' });
    expect(closeFirst).toHaveBeenCalledTimes(1);
    expect(closeSecond).not.toHaveBeenCalled();
  });

  it('closes the card on Esc while typing in an assistant that ignores Esc', () => {
    const closeCard = vi.fn();
    const onAssistantEscape = vi.fn();
    function Assistant() {
      const ref = useDismissOnOutsideInteraction<HTMLDivElement>({
        enabled: false,
        onEscape: onAssistantEscape,
      });
      return (
        <div data-dismissable="">
          <div ref={ref}>
            <textarea aria-label="chat" />
          </div>
        </div>
      );
    }
    render(
      <>
        <Harness onDismiss={closeCard} />
        <Assistant />
      </>
    );
    const chat = screen.getByLabelText('chat');
    chat.focus();
    fireEvent.keyDown(chat, { key: 'Escape', code: 'Escape' });
    expect(closeCard).toHaveBeenCalledTimes(1);
    expect(onAssistantEscape).not.toHaveBeenCalled();
  });
});
