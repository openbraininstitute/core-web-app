// The content modal's dialog, and the popups its controls open, which antd and Radix portal to
// <body>, outside the dialog: antd's select options and pop-confirms, and Radix's menus.
const INSIDE_CONTENT_MODAL =
  '#modal-dialog, .ant-select-dropdown, .ant-popover, [data-radix-popper-content-wrapper]';

/** Whether a click landed in the content modal, so the panel stays open. */
export function isInsideContentModal(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(INSIDE_CONTENT_MODAL) !== null;
}
