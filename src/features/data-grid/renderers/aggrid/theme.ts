import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid v35 theme, driven by the app's design tokens (CSS variables) so light/dark
 * mode flows through automatically.
 */
export const dataGridTheme = themeQuartz.withParams({
  // palette
  accentColor: 'var(--color-primary-6, #1668dc)',
  foregroundColor: 'var(--color-primary-9, #101828)',
  backgroundColor: 'var(--color-background, #ffffff)',
  textColor: 'var(--color-primary-8, #1f2a37)',

  // typography
  fontFamily: 'inherit',
  fontSize: 14,

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

  // filter popover
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
  checkboxBorderRadius: 4,
  checkboxCheckedBackgroundColor: 'var(--color-primary-9, #101828)',
});

/** AG's built-in strings are Title Case; the app writes UI copy in sentence case. */
export const DATA_GRID_LOCALE_TEXT = {
  noRowsToShow: 'No entities to show',
} as const;

/**
 * Restyles AG's selection control as a radio: AG renders the same checkbox widget for
 * `singleRow` and `multiRow`, with no native radio. Apply on the grid wrapper.
 */
export const SINGLE_SELECT_RADIO_CLASS = [
  '[&_.ag-selection-checkbox_.ag-checkbox-input-wrapper]:rounded-full!',
  '[&_.ag-selection-checkbox_.ag-checkbox-input-wrapper.ag-checked::after]:[mask:none]!',
  '[&_.ag-selection-checkbox_.ag-checkbox-input-wrapper.ag-checked::after]:inset-[3px]!',
  '[&_.ag-selection-checkbox_.ag-checkbox-input-wrapper.ag-checked::after]:rounded-full',
].join(' ');
