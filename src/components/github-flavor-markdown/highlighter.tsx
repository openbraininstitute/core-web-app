import { PropsWithChildren } from 'react';
import { BundledLanguage } from 'shiki';

import { CodeBlock as DCodeBlock } from '@/ui/molecules/code-blocks';

export function Highlighter({ children }: PropsWithChildren) {
  const codeElement = children as React.ReactElement<{ children?: string; className?: string }>;
  const codeClassName = codeElement.props.className;
  const languageMatch = codeClassName?.match(/language-(\w+)/);
  const language = (languageMatch ? languageMatch[1] : 'text') as BundledLanguage;
  const code = codeElement.props.children || '';

  return <DCodeBlock code={code} language={language} />;
}
