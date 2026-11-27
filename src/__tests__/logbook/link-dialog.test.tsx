import { fireEvent, render, screen } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, expect, test } from 'vitest';

import { contentExtensions } from '@/features/logbook/blocks/extensions';
import { LinkTool } from '@/features/logbook/editor/format-bar';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());
// jsdom has no top layer; a modal is just an open dialog here.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
});

test('the link button opens a dialog with the selected text, and Save links it', () => {
  const e = new Editor({
    element: document.body.appendChild(document.createElement('div')),
    extensions: contentExtensions,
    content: '<p>see the docs</p>',
  });
  editor = e;
  e.commands.setTextSelection({ from: 5, to: 13 });
  render(<LinkTool editor={e as never} pressed={false} disabled={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Link' }));
  expect(screen.getByRole('dialog', { name: 'Add link' })).toBeTruthy();
  expect(screen.getByRole('textbox', { name: 'Text' })).toHaveProperty('value', 'the docs');
  fireEvent.change(screen.getByRole('textbox', { name: 'Link' }), {
    target: { value: 'example.org' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(e.getHTML()).toContain('href="https://example.org"');
  expect(e.state.doc.textContent).toBe('see the docs');
});
