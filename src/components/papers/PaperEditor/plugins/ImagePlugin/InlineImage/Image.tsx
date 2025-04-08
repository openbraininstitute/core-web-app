import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import { Popover, Select } from 'antd';
import NextImage from 'next/image';

import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  DRAGSTART_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import type { LexicalEditor, NodeKey } from 'lexical';

import BrokenImage from '../BrokenImage';
// eslint-disable-next-line import/no-cycle
import { $isInlineImageNode } from '../utils';
// eslint-disable-next-line import/no-cycle
import InlineImageNode from './Node';
import { Position } from '@/components/papers/uploader/types';
import { EditPenSquare } from '@/components/icons/EditorIcons';
import { classNames } from '@/util/utils';

import './style.css';

function UpdateImagePosition({
  editor,
  nodeKey,
  imgPosition,
}: {
  editor: LexicalEditor;
  nodeKey: NodeKey;
  imgPosition: Position;
}) {
  const editorState = editor.getEditorState();
  const node = editorState.read(() => $getNodeByKey(nodeKey) as InlineImageNode);

  const [position, setPosition] = useState<Position>(node.getPosition());
  const [open, setOpen] = useState(false);

  const onOpenChange = (value: boolean) => setOpen(value);
  const onPositionChange = (value: Position) => {
    setPosition(value);
    if (node) {
      editor.update(() => {
        node.update({ position: value });
      });
    }
    setOpen(false);
  };

  return (
    <Popover
      title="Inline Position"
      placement={imgPosition === 'left' ? 'bottomLeft' : 'bottomRight'}
      trigger="click"
      arrow={false}
      open={open}
      onOpenChange={onOpenChange}
      // className="hidden group-hover:flex"
      content={
        <Select
          size="large"
          defaultValue={undefined}
          value={position}
          onChange={onPositionChange}
          className="w-full [&_.ant-select-selector]:rounded-md"
          options={[
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
            { value: 'full', label: 'Full' },
          ]}
        />
      }
    >
      <button
        type="button"
        aria-label="Edit position"
        className={classNames(
          'hidden group-hover:flex',
          'absolute top-4 rounded-md border border-gray-200 bg-white p-2 shadow-md hover:bg-gray-200',
          position === 'left' ? 'left-4' : 'right-4'
        )}
      >
        <EditPenSquare />
      </button>
    </Popover>
  );
}

export default function InlineImage({
  src,
  alt,
  nodeKey,
  width,
  height,
  position,
}: {
  nodeKey: NodeKey;
  alt: string;
  src: string;
  width?: number;
  height?: number;
  position: Position;
}): JSX.Element {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
  const [editor] = useLexicalComposerContext();
  const activeEditorRef = useRef<LexicalEditor | null>(null);
  const [isLoadError, setIsLoadError] = useState<boolean>(false);

  const $onDelete = useCallback(
    (payload: KeyboardEvent) => {
      if (isSelected && $isNodeSelection($getSelection())) {
        const event: KeyboardEvent = payload;
        event.preventDefault();
        const node = $getNodeByKey(nodeKey);
        if ($isInlineImageNode(node)) {
          node.remove();
          return true;
        }
      }
      return false;
    },
    [isSelected, nodeKey]
  );

  const $onEnter = useCallback(
    (event: KeyboardEvent) => {
      const latestSelection = $getSelection();
      const buttonElem = buttonRef.current;
      if (
        isSelected &&
        $isNodeSelection(latestSelection) &&
        latestSelection.getNodes().length === 1
      ) {
        if (buttonElem !== null && buttonElem !== document.activeElement) {
          event.preventDefault();
          buttonElem.focus();
          return true;
        }
      }
      return false;
    },
    [isSelected]
  );

  const $onEscape = useCallback(
    (event: KeyboardEvent) => {
      if (buttonRef.current === event.target) {
        editor.update(() => {
          setSelected(true);
          const parentRootElement = editor.getRootElement();
          if (parentRootElement !== null) {
            parentRootElement.focus();
          }
        });
        return true;
      }
      return false;
    },
    [editor, setSelected]
  );

  const onClick = useCallback(
    (payload: MouseEvent) => {
      const event = payload;

      if (event.target === imageRef.current) {
        if (event.shiftKey) {
          setSelected(!isSelected);
        } else {
          clearSelection();
          setSelected(true);
        }
        return true;
      }

      return false;
    },
    [isSelected, setSelected, clearSelection]
  );

  useEffect(() => {
    const unregister = mergeRegister(
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_, activeEditor) => {
          activeEditorRef.current = activeEditor;
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        (payload) => {
          const event = payload;
          if (event.target === imageRef.current) {
            if (event.shiftKey) {
              setSelected(!isSelected);
            } else {
              clearSelection();
              setSelected(true);
            }
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        DRAGSTART_COMMAND,
        (event) => {
          if (event.target === imageRef.current) {
            // TODO This is just a temporary workaround for FF to behave like other browsers.
            // Ideally, this handles drag & drop too (and all browsers).
            event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(KEY_DELETE_COMMAND, $onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_BACKSPACE_COMMAND, $onDelete, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ENTER_COMMAND, $onEnter, COMMAND_PRIORITY_LOW),
      editor.registerCommand(KEY_ESCAPE_COMMAND, $onEscape, COMMAND_PRIORITY_LOW),
      editor.registerCommand<MouseEvent>(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW)
    );
    return () => {
      unregister();
    };
  }, [
    clearSelection,
    editor,
    isSelected,
    nodeKey,
    $onDelete,
    $onEnter,
    $onEscape,
    setSelected,
    onClick,
  ]);

  return (
    <div className={classNames('group relative p-2', isSelected && 'focused')}>
      {isLoadError ? (
        <BrokenImage ref={imageRef} />
      ) : (
        <>
          <UpdateImagePosition nodeKey={nodeKey} editor={editor} imgPosition={position} />
          <NextImage
            className="h-full w-full object-contain"
            src={src}
            alt={alt}
            width={width ?? undefined}
            height={height ?? undefined}
            fill={!width || !height}
            ref={imageRef}
            onError={() => setIsLoadError(true)}
          />
        </>
      )}
    </div>
  );
}
