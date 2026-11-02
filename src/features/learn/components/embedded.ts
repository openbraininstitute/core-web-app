import { createContext } from 'react';

/**
 * True round a course's figure shown outside its course, as on the Learn page: there it keeps to
 * its box whatever the spill setting says, and leaves the arrow keys to the page.
 */
export const Embedded = createContext(false);

/** Whether a course's figure draws its scale bar: a page showing it as a picture may leave it out. */
export const FigureScaleBar = createContext(true);
