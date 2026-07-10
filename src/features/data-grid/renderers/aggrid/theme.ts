import { themeMaterial } from 'ag-grid-community';

/**
 * AG Grid v35 Theming API — an elegant, Airbnb-flavoured look driven by the app's
 * design tokens (CSS variables) so light/dark mode flows through automatically.
 *
 * Design intent: whisper-soft hairline borders, generous cell padding, a quiet
 * transparent header with a semibold label, a warm hover, and — crucially — a
 * self-contained filter popover with a soft elevation, rounded corners and a
 * hairline border (so it reads as a floating card, not a raw menu). Filter inputs
 * get rounded corners, a calm resting border and a branded focus ring.
 */
export const dataGridTheme = themeMaterial.withParams({
  // palette
  accentColor: 'var(--color-primary-6, #1668dc)',
  foregroundColor: 'var(--color-primary-9, #101828)',
  backgroundColor: 'var(--color-background, #ffffff)',
  textColor: 'var(--color-primary-8, #1f2a37)',

  // typography
  fontFamily: 'inherit',
  fontSize: 16,

  // chrome — hairline borders only, no vertical rules
  borderColor: 'color-mix(in srgb, var(--color-primary-9, #101828) 8%, transparent)',
  wrapperBorder: false,
  rowBorder: {
    style: 'solid',
    width: 1,
    color: 'color-mix(in srgb, var(--color-primary-9, #101828) 6%, transparent)',
  },
  columnBorder: false,
  headerColumnBorder: false,
  headerRowBorder: {
    style: 'solid',
    width: 1,
    color: 'color-mix(in srgb, var(--color-primary-9, #101828) 10%, transparent)',
  },

  // header
  headerBackgroundColor: 'transparent',
  headerTextColor: 'var(--color-primary-8, #1f2a37)',
  headerFontWeight: 600,
  headerColumnResizeHandleColor:
    'color-mix(in srgb, var(--color-primary-9, #101828) 12%, transparent)',
  headerColumnResizeHandleHeight: '40%',

  // rows
  cellHorizontalPadding: 16,
  rowHoverColor: 'color-mix(in srgb, var(--color-primary-6, #1668dc) 4%, transparent)',
  selectedRowBackgroundColor: 'color-mix(in srgb, var(--color-primary-6, #1668dc) 8%, transparent)',
  oddRowBackgroundColor: 'transparent',

  // filter popover — a floating card, not a raw menu
  menuBackgroundColor: 'var(--color-background, #ffffff)',
  menuBorder: {
    style: 'solid',
    width: 1,
    color: 'color-mix(in srgb, var(--color-primary-9, #101828) 8%, transparent)',
  },
  popupShadow:
    '0 8px 28px -6px color-mix(in srgb, var(--color-primary-9, #101828) 28%, transparent)',
  wrapperBorderRadius: 12,
  borderRadius: 8,

  // inputs
  inputBackgroundColor: 'var(--color-background, #ffffff)',
  inputBorder: {
    style: 'solid',
    width: 1,
    color: 'color-mix(in srgb, var(--color-primary-9, #101828) 14%, transparent)',
  },
  inputBorderRadius: 8,
  inputFocusBorder: {
    style: 'solid',
    width: 1,
    color: 'var(--color-primary-6, #1668dc)',
  },
  focusShadow: '0 0 0 3px color-mix(in srgb, var(--color-primary-6, #1668dc) 16%, transparent)',
  checkboxCheckedBackgroundColor: 'var(--color-primary-6, #1668dc)',
});
