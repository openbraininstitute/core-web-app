/**
 * The details page's side menu on a phone (no room beside the content): its section tabs and its actions each a row
 * that scrolls sideways above the content, every control its own width, the tabs without their arrows.
 * A plain module, so the server layout and the client body share it.
 */
export const PHONE_DETAIL_SIDEBAR = [
  'max-md:w-full max-md:gap-2 max-md:pl-0',
  'max-md:[&>div]:mt-0 max-md:[&>div]:flex-row max-md:[&>div]:gap-2 max-md:[&>div]:px-0 max-md:[&>div]:py-0.5',
  'max-md:[&>div]:overflow-x-auto max-md:[&>div]:no-scrollbar',
  'max-md:[&_a]:w-auto max-md:[&_a]:shrink-0 max-md:[&_button]:w-auto max-md:[&_button]:shrink-0',
  'max-md:[&_a>svg]:hidden',
].join(' ');
