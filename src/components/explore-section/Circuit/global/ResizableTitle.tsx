import { Resizable, ResizeCallbackData } from 'react-resizable';

export type ResizableTitleProps = {
  onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  width?: number;
  [key: string]: any;
};

export default function ResizableTitle(props: ResizableTitleProps) {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <th {...restProps} />;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  };

  const handleResizeEvent = (e: React.SyntheticEvent, data: ResizeCallbackData) => {
    if (onResize) {
      onResize(e, data);
    }
  };

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="absolute -right-[5px] top-7 z-10 h-[16px] w-px cursor-col-resize bg-black/25 hover:bg-black/50"
          role="button"
          tabIndex={0}
          aria-label={`Resize ${restProps.title || 'column'}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
      }
      onResize={handleResizeEvent}
    >
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <th {...restProps} />
    </Resizable>
  );
}
