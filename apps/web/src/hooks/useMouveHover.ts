import { useState } from 'react';

function useMouseHover(): [
  mouseHover: boolean,
  mousehoverProps: {
    onMouseOver: React.MouseEventHandler;
    onFocus: React.FocusEventHandler;
    onMouseOut: React.MouseEventHandler;
    onBlur: React.FocusEventHandler;
  },
] {
  const [mouseHover, setMouseHover] = useState<boolean>(false);
  return [
    mouseHover,
    {
      onMouseOver: () => setMouseHover(true),
      onFocus: () => setMouseHover(true),
      onMouseOut: () => setMouseHover(false),
      onBlur: () => setMouseHover(false),
    },
  ];
}

export default useMouseHover;
