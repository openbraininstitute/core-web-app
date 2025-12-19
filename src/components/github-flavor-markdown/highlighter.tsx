import type { PropsWithChildren } from 'react';
import type { BundledLanguage } from 'shiki';

import {
  CodeBlockCopyButton,
  CodeBlockLanguageLabel,
  CodeBlock as DCodeBlock,
} from '@/ui/molecules/code-blocks';
import { cn } from '@/utils/css-class';

export function Highlighter({ children }: PropsWithChildren) {
  const codeElement = children as React.ReactElement<{
    children?: string;
    className?: string;
  }>;
  const codeClassName = codeElement.props.className;
  const languageMatch = codeClassName?.match(/language-(\w+)/);
  const language = (languageMatch ? languageMatch[1] : 'text') as BundledLanguage;
  const code = codeElement.props.children || '';

  return (
    <DCodeBlock
      code={code}
      language={language}
      className={cn(
        'secondary-scrollbar h-full overflow-auto [&_pre]:overflow-x-auto',
        '[&_pre]:whitespace-pre [&>div]:overflow-auto [&>div>div]:overflow-x-auto',
        'border-gray-300 border-t-gray-300 bg-white! [&_.shiki]:bg-white! [&_.shiki]:shadow-xl!',
      )}
    >
      <div className="bg-neutral-light flex items-center justify-between px-2 py-2">
        <CodeBlockLanguageLabel />
        <div className="flex items-center gap-2">
          <CodeBlockCopyButton
            className="size-8 rounded-full px-2 hover:bg-gray-300"
            iconClassName="text-gray-500 size-4"
          />
        </div>
      </div>
    </DCodeBlock>
  );
}
