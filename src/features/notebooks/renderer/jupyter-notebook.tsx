'use client';

import python from '@jupyter-kit/core/langs/python';
import { Notebook } from '@jupyter-kit/react';

import '@jupyter-kit/theme-default/default.css';
import '@jupyter-kit/theme-default/syntax/github-light.css';
import './notebook-renderer.css';

import type { Ipynb } from '@jupyter-kit/core';

const LANGUAGES = [python];

export default function JupyterNotebook({ ipynb }: { ipynb: Ipynb }) {
  return <Notebook ipynb={ipynb} language="python" languages={LANGUAGES} />;
}
