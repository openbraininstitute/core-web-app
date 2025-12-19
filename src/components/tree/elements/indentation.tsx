import { memo } from 'react';

export const VerticalIndentationLine = memo(
  ({
    left,
    top,
    height,
    lineStyle,
  }: {
    left: number;
    top: number;
    height: string | number;
    lineStyle: string;
  }) => (
    <div
      className={`absolute border-l ${lineStyle}`}
      style={{
        left: `${left}px`,
        top,
        height,
      }}
    />
  ),
);
VerticalIndentationLine.displayName = 'VerticalIndentationLine';

export const HorizontalIndentationLine = memo(
  ({
    left,
    top,
    width,
    lineStyle,
  }: {
    left: number;
    top: number;
    width: string | number;
    lineStyle: string;
  }) => (
    <div
      className={`absolute border-t ${lineStyle}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width,
      }}
    />
  ),
);

HorizontalIndentationLine.displayName = 'HorizontalIndentationLine';
