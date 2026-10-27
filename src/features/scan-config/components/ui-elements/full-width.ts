import type { CSSProperties } from 'react';

// Inline rather than `w-full`: antd's `width: 90px` has the same specificity, and
// its server-rendered styles stream into `<body>` after Tailwind's, so they win.
export const FULL_WIDTH: CSSProperties = { width: '100%' };
