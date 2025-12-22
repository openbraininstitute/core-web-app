/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { CheckOutlined as CheckIcon, CopyOutlined as CopyIcon } from '@ant-design/icons';
import type { Element } from 'hast';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { type BundledLanguage, codeToHtml, type ShikiTransformer } from 'shiki';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};

type CodeBlockContextType = {
  code: string;
  language: BundledLanguage;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
  language: 'text' as BundledLanguage,
});

const lineNumberTransformer: ShikiTransformer = {
  name: 'line-numbers',
  line(node: Element, line: number) {
    node.children.unshift({
      type: 'element',
      tagName: 'span',
      properties: {
        className: [
          'inline-block',
          'min-w-10',
          'mr-4',
          'text-right',
          'select-none',
          'text-muted-foreground',
        ],
      },
      children: [{ type: 'text', value: String(line) }],
    });
  },
};

export async function highlightCode(
  code: string,
  language: BundledLanguage,
  showLineNumbers = false
) {
  const transformers: ShikiTransformer[] = showLineNumbers ? [lineNumberTransformer] : [];

  return await Promise.all([
    codeToHtml(code, {
      lang: language,
      theme: 'one-light',
      transformers,
    }),
    codeToHtml(code, {
      lang: language,
      theme: 'one-dark-pro',
      transformers,
    }),
  ]);
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>('');
  const [darkHtml, setDarkHtml] = useState<string>('');
  const mounted = useRef(false);

  useEffect(() => {
    highlightCode(code, language, showLineNumbers).then(([light, dark]) => {
      if (!mounted.current) {
        setHtml(light);
        setDarkHtml(dark);
        mounted.current = true;
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers]);

  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <CodeBlockContext.Provider value={{ code, language }}>
      <div
        className={cn(
          'group bg-background text-foreground border-neutral-light relative w-full overflow-hidden rounded-md border',
          className
        )}
        {...props}
      >
        {children}
        <div className="relative">
          <div
            className="[&>pre]:bg-background! [&>pre]:text-foreground! overflow-hidden dark:hidden [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <div
            className="[&>pre]:bg-background! [&>pre]:text-foreground! hidden overflow-hidden dark:block [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: darkHtml }}
          />
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
}

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
  iconClassName?: string;
};

export function CodeBlockLanguageLabel({ className }: { className?: string }): React.ReactElement {
  const { language } = useContext(CodeBlockContext);

  return (
    <span
      className={cn(
        'rounded-full border border-gray-300 px-4 py-1 text-xs',
        'font-medium tracking-wide text-gray-500 uppercase',
        className
      )}
    >
      {language}
    </span>
  );
}

export function CodeBlockCopyButton({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  iconClassName,
  ...props
}: CodeBlockCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      onError?.(new Error('Clipboard API not available'));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={copyToClipboard}
      variant="icon"
      {...props}
    >
      {children ?? <Icon size={14} className={iconClassName} />}
    </Button>
  );
}
