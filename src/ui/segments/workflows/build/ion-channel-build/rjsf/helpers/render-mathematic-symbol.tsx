import katex from 'katex';

export const renderMathInText = (text: string) => {
  const parts = [];
  let currentIndex = 0;

  // regex to match LaTeX expressions (backslash followed by command or underscore/superscript)
  const latexRegex =
    /\$(.+?)\$|\\[a-zA-Z]+(?:_\{[^}]+\}|\^\{[^}]+\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9])?|[a-zA-Z0-9]+_\{[^}]+\}/g;
  // /\\[a-zA-Z]+(?:_\{[^}]+\}|\^\{[^}]+\}|_[a-zA-Z0-9]|\^[a-zA-Z0-9])?|[a-zA-Z0-9]+_\{[^}]+\}/g;

  let match: RegExpExecArray | null;
  const regex = new RegExp(latexRegex);

  // find all Latex expressions in the line
  const matches = [];
  // biome-ignore lint/suspicious/noAssignInExpressions: needed
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      text: match[0],
      endIndex: match.index + match[0].length,
    });
  }

  // build parts array with regular text and LaTeX
  matches.forEach((mt) => {
    // add regular text before this match
    if (mt.index > currentIndex) {
      parts.push({
        type: 'text',
        content: text.substring(currentIndex, mt.index),
      });
    }

    // add Latex match
    parts.push({
      type: 'latex',
      content: mt.text,
    });

    currentIndex = mt.endIndex;
  });

  // add remaining text after last match
  if (currentIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(currentIndex),
    });
  }

  // if no matches found, return the whole text as regular text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text,
    });
  }

  return (
    <>
      {parts.map((part) => {
        if (part.type === 'latex') {
          try {
            const html = katex.renderToString(part.content.replace(/^\$|\$$/g, ''), {
              throwOnError: false,
              displayMode: false,
              output: 'html',
            });
            return (
              <span
                key={html}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: required here
                dangerouslySetInnerHTML={{ __html: html }}
                className="inline-block"
              />
            );
          } catch {
            return (
              <span key={part.content} className="text-red-600">
                {part.content}
              </span>
            );
          }
        } else {
          return <span key={part.content}>{part.content}</span>;
        }
      })}
    </>
  );
};
