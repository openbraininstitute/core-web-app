'use client';

import { CheckOutlined as CheckIcon, CopyOutlined as CopyIcon } from '@ant-design/icons';
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
  scrollableX?: boolean;
  contentClassName?: string;
};

type CodeBlockContextType = {
  code: string;
  language: BundledLanguage;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: '',
  language: 'text' as BundledLanguage,
});

type THastLikeElement = {
  children: Array<{
    type: string;
    tagName?: string;
    properties?: Record<string, unknown>;
    children?: Array<{ type: string; value: string }>;
  }>;
};

const lineNumberTransformer: ShikiTransformer = {
  name: 'line-numbers',
  line(node, line: number) {
    const hastNode = node as unknown as THastLikeElement;
    hastNode.children.unshift({
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

  // Use dual themes with CSS variables for class-based switching
  return codeToHtml(code, {
    lang: language,
    themes: {
      light: 'catppuccin-latte',
      dark: 'catppuccin-mocha',
    },
    defaultColor: false, // Use CSS variables instead of inline colors
    transformers,
  });
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  scrollableX = false,
  contentClassName,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>('');
  const mounted = useRef(false);

  useEffect(() => {
    highlightCode(code, language, showLineNumbers).then((highlighted) => {
      if (!mounted.current) {
        setHtml(highlighted);
        mounted.current = true;
      }
    });

    return () => {
      mounted.current = false;
    };
  }, [code, language, showLineNumbers]);

  return (
    <CodeBlockContext.Provider value={{ code, language }}>
      <div
        className={cn(
          'group bg-background text-foreground border-neutral-light relative w-full rounded-md border',
          scrollableX ? 'overflow-x-auto overflow-y-hidden' : 'overflow-hidden',
          className
        )}
        {...props}
      >
        {children}
        <div className="relative">
          <div
            className={cn(
              '[&>pre]:bg-background! [&>pre]:text-foreground! [&_code]:font-mono [&_code]:text-sm [&>pre]:m-0 [&>pre]:p-4 [&>pre]:text-sm',
              scrollableX
                ? 'secondary-scrollbar overflow-x-auto overflow-y-hidden [&>pre]:min-w-max [&>pre]:w-max'
                : 'overflow-hidden',
              contentClassName
            )}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: required
            dangerouslySetInnerHTML={{ __html: html }}
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

export function CodeBlockLanguageLabel({
  className,
  title,
}: {
  className?: string;
  title?: string;
}): React.ReactElement {
  const { language } = useContext(CodeBlockContext);

  return (
    <span
      title={title}
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
