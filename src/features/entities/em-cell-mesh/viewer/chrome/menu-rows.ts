import { createHelpRows } from '@/features/viewer-3d/chrome/menu-rows';

import { HELP } from '../help/help-text';

export { Heading, ICON, Note } from '@/features/viewer-3d/chrome/menu-rows';

export const { SectionTitle, HelpRow, ToggleRow, SliderRow } = createHelpRows(HELP);
