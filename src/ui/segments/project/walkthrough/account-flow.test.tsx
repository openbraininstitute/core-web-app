import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AccountFlow } from './account-flow';

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open');
});
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

beforeEach(() => {
  showModal.mockClear();
  close.mockClear();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: showModal,
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: close });
});
afterEach(() => {
  cleanup();
  if (originalShowModal)
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});
const props = () => ({ onClose: vi.fn(), onSignedIn: vi.fn(), onEnter: vi.fn(), onLearn: vi.fn() });

it('uses a native modal and closes it when the flow unmounts', () => {
  const view = render(<AccountFlow mode="signup" {...props()} />);
  expect(screen.getByRole('dialog', { name: 'Sign up' }).tagName).toBe('DIALOG');
  expect(showModal).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(close).toHaveBeenCalledTimes(1);
});

it('lets the browser cancel action close the flow', () => {
  const handlers = props();
  render(<AccountFlow mode="login" {...handlers} />);
  fireEvent(screen.getByRole('dialog', { name: 'Log in' }), new Event('cancel', { bubbles: true }));
  expect(handlers.onClose).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Email')).not.toHaveAttribute('autofocus');
});
