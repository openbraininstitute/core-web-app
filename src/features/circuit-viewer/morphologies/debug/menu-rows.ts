import { createHelpRows } from '@/features/viewer-3d/chrome/menu-rows';

import { HELP } from './help-text';

export { ICON } from '@/features/viewer-3d/chrome/menu-rows';

export const { SectionTitle, HelpRow, ToggleRow } = createHelpRows(HELP);
