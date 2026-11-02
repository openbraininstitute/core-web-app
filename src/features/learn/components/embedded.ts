import { createContext } from 'react';

/**
 * True round a course's figure shown outside its course, as on the Learn page: there it keeps to
 * its box whatever the spill setting says, and leaves the arrow keys to the page.
 */
export const Embedded = createContext(false);
