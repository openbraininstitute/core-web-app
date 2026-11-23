import { expect, test } from 'vitest';

import { stopInnerDrag } from '@/features/logbook/editor/extensions';

const editorWith = (html: string): HTMLElement => {
  const editor = document.createElement('div');
  editor.innerHTML = html;
  editor.addEventListener('dragstart', stopInnerDrag, true);
  document.body.replaceChildren(editor);
  return editor;
};

const dragFrom = (node: Node): boolean => {
  const event = new Event('dragstart', { bubbles: true, cancelable: true });
  node.dispatchEvent(event);
  return event.defaultPrevented;
};

test('a drag of selected text in a card (the 3D viewer labels) is cancelled', () => {
  const editor = editorWith(
    '<div draggable="true"><div data-node-view-wrapper><p id="label">Colour by</p></div></div>'
  );
  const label = editor.querySelector('#label')?.firstChild;
  expect(label).not.toBeNull();
  expect(dragFrom(label as Node)).toBe(true);
});

test('moving the card itself, and dragging page text, are left alone', () => {
  const editor = editorWith(
    '<div id="card" draggable="true"><div data-node-view-wrapper><div data-node-view-content><p id="text">note</p></div></div></div><p id="page">text</p>'
  );
  expect(dragFrom(editor.querySelector('#card') as Node)).toBe(false);
  expect(dragFrom(editor.querySelector('#text') as Node)).toBe(false);
  expect(dragFrom(editor.querySelector('#page') as Node)).toBe(false);
});
