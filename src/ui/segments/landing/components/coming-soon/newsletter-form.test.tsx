import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import subscribeNewsletterHandler from '@/api/mailchimp/subscribe-newsletter';

import { renderWithProviders } from '../../../../../../tests/test-utils';
import NewsletterForm from './newsletter-form';

vi.mock('@/api/mailchimp/subscribe-newsletter', () => ({
  default: vi.fn(() => Promise.resolve({ subscribed: true, message: 'ok' })),
}));

const mockedSubscribe = vi.mocked(subscribeNewsletterHandler);

describe('NewsletterForm', () => {
  it('shows a required-field validation message when submitting empty', async () => {
    renderWithProviders(<NewsletterForm />);

    const submit = screen.getByRole('button', { name: /subscribe to newsletter/i });
    // Antd disables the submit until validation passes; force a validation cycle
    // by typing-then-clearing the name field.
    const nameInput = screen.getByPlaceholderText(/enter your first name/i);
    fireEvent.change(nameInput, { target: { value: 'a' } });
    fireEvent.change(nameInput, { target: { value: '' } });

    await waitFor(() => expect(screen.getByText(/please enter your name/i)).toBeInTheDocument());

    // The disabled submit also implies validation failed.
    expect(submit).toBeDisabled();
    expect(mockedSubscribe).not.toHaveBeenCalled();
  });

  it('calls the subscribe handler on a valid submission', async () => {
    renderWithProviders(<NewsletterForm />);

    const nameInput = screen.getByPlaceholderText(/enter your first name/i);
    const emailInput = screen.getByPlaceholderText(/enter your email address/i);

    fireEvent.change(nameInput, { target: { value: 'Ada' } });
    fireEvent.change(emailInput, { target: { value: 'ada@example.com' } });

    // accept_terms checkbox — Antd renders a native <input type="checkbox">
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const submit = await waitFor(() => {
      const btn = screen.getByRole('button', { name: /subscribe to newsletter/i });
      expect(btn).not.toBeDisabled();
      return btn;
    });

    fireEvent.click(submit);

    await waitFor(() => expect(mockedSubscribe).toHaveBeenCalledTimes(1));
    expect(mockedSubscribe).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
      tags: [],
    });
  });
});
