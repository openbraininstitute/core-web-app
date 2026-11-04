import { DM_Serif_Text } from 'next/font/google';

/** The italic of the logo's and the titles' serif, a true one: the root layout loads its upright alone. */
export const serifItalic = DM_Serif_Text({ weight: '400', style: 'italic', subsets: ['latin'] });
