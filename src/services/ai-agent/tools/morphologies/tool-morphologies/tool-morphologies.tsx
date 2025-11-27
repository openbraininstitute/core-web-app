/* eslint-disable react/no-array-index-key */
import React from 'react';
import { ToolInvocationUIPart } from '@ai-sdk/ui-utils';

import Expand from '../../expand';
import { useMorphologies } from './hooks';
import MorphologyCard from './morphology-card';

interface ToolArticlesProps {
  className?: string;
  part: ToolInvocationUIPart;
}

export default function ToolMorphologies({ className, part }: ToolArticlesProps) {
  const morphologies = useMorphologies(part);

  if (morphologies.length === 0) return null;

  return (
    <Expand
      className={className}
      title={
        <>
          Show all morphologies (<strong>{morphologies.length}</strong>)
        </>
      }
    >
      {morphologies.map((morphology) => (
        <MorphologyCard key={morphology.id} value={morphology} />
      ))}
    </Expand>
  );
}
