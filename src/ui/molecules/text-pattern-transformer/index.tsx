import { cloneElement, Fragment, isValidElement } from 'react';

import type { ReactNode } from 'react';

export type Component = (match: string) => ReactNode;
/**
 * react component type for the generic Linkify component.
 */
export type ReactLinkItProps = React.FC<
  React.PropsWithChildren<{
    component: Component;
    regex: RegExp;
  }>
>;

let key = 0;
export const getKey = (): number => ++key;
export const urlRegex = /(https?:\/\/|www\.)[^\s<>'"()[\]{}]+[^\s<>'"()[\]{}.,;:!?\])}]/u;

/**
 * recursively finds and processes text nodes in React children
 */
export function recursiveFindText(
  children: ReactNode,
  component: Component,
  regex: RegExp
): ReactNode {
  if (typeof children === 'string') {
    return replacePattern(children, component, regex);
  }

  if (Array.isArray(children)) {
    return children.map((c) => recursiveFindText(c, component, regex));
  }

  if (
    isValidElement(children) &&
    typeof children.props === 'object' &&
    children.props !== null &&
    'children' in children.props &&
    children.type !== 'a' &&
    children.type !== 'button'
  ) {
    return cloneElement(
      children,
      { ...children.props },
      recursiveFindText((children.props as { children: ReactNode }).children, component, regex)
    );
  }

  return children;
}

/**
 * generic function to replace any pattern in a string using custom component.
 */
export function replacePattern(
  text: string,
  linkComponent: Component,
  linkRegex: RegExp
): string | ReactNode[] {
  const elements: ReactNode[] = [];
  let rest = text;
  let hasMatches = false;

  while (true) {
    const match = linkRegex.exec(rest);
    if (!match || match[0] === undefined) break;

    hasMatches = true;
    const urlStartIndex = match.index;
    const urlEndIndex = match.index + match[0].length;

    const textBeforeMatch = rest.slice(0, urlStartIndex);
    const url = rest.slice(urlStartIndex, urlEndIndex);
    rest = rest.slice(urlEndIndex);
    if (textBeforeMatch) {
      elements.push(textBeforeMatch);
    }
    elements.push(linkComponent(url));
  }

  if (hasMatches && rest) {
    elements.push(rest);
  }

  if (!hasMatches) {
    return text;
  }

  return elements;
}

/**
 * TextPatternTransformer
 *
 * react component that can wrap around
 * any React component to replace any pattern using a custom regex and component.
 */
export const TextPatternTransformer: ReactLinkItProps = (props) => {
  return <Fragment>{recursiveFindText(props.children, props.component, props.regex)}</Fragment>;
};
