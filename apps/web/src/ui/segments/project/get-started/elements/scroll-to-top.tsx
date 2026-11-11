'use client';

import { useEffect } from 'react';

export function ScrollToTop() {
  useEffect(() => {
    const container = document.getElementById('project-main-content');
    container?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return null;
}
