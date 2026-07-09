import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid v35 Theming API, parameterised from the app's design tokens via CSS
 * variables — so light/dark mode and future token changes flow through without
 * touching this file. Fallbacks keep the grid legible if a token is missing.
 */
export const dataGridTheme = themeQuartz.withParams({
  accentColor: 'var(--color-primary-6, #1668dc)',
  headerTextColor: 'var(--color-primary-8, #1f2a37)',
  headerBackgroundColor: 'transparent',
  headerColumnResizeHandleColor: 'var(--color-border, rgba(0, 0, 0, 0.12))',
  borderColor: 'var(--color-border-secondary, rgba(0, 0, 0, 0.06))',
  rowBorder: true,
  fontFamily: 'inherit',
  fontSize: 13,
  rowHoverColor: 'color-mix(in srgb, var(--color-primary-6, #1668dc) 6%, transparent)',
  selectedRowBackgroundColor:
    'color-mix(in srgb, var(--color-primary-6, #1668dc) 10%, transparent)',
  checkboxCheckedBackgroundColor: 'var(--color-primary-6, #1668dc)',
});
