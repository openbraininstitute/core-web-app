import { Geist, Geist_Mono } from 'next/font/google';

// the learn app's typefaces: Geist for its dark theme, and Geist Mono for code, the slide count and labels
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

/** Their variables, on whatever holds a course or one of its figures. */
export const learnFonts = `${geistSans.variable} ${geistMono.variable}`;
