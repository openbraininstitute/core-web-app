'use client';

import { RiFileLine } from '@remixicon/react';
import { getToolName, isFileUIPart, isToolUIPart } from 'ai';
import React from 'react';

import { classNames } from '@/util/utils';

import { MINIMAL_PANEL_SIZE, usePanelWidth } from '../hooks';
import { GithubFlavorMarkdown } from '../markdown';
import { CollapsibleMessage } from './collapsible-message';
import { ExpandableImage } from './expandable-image';
import { BackupPlotsWrapper, extractStorageIdsFromMessage } from './plots';
import { StorageImagePart } from './storage-image-part';
import ToolsProgress from './tools-progress';
import { useMessageDiffs } from './use-message-diffs';

import type { UIMessage } from '@ai-sdk/react';
import type { ApprovalResponseFn } from './tools-progress/tools-progress';

import styles from './message-item.module.css';

interface MessageItemProps {
  className?: string;
  value: UIMessage;
  status?: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage?: boolean;
  addToolApprovalResponse?: ApprovalResponseFn | null;
}

export const MessageItem = React.memo(RawMessageItem);

function RawMessageItem({
  className,
  value,
  status = 'ready',
  isLastMessage = false,
  addToolApprovalResponse,
}: MessageItemProps) {
  const debug = useDebug();

  if (value.role === 'user' && value.parts.length === 0) {
    return null;
  }

  if (value.role === 'assistant') {
    const hasVisibleParts = value.parts.some(
      (p) => (p.type === 'text' && 'text' in p && p.text !== '') || isToolUIPart(p)
    );
    if (!hasVisibleParts) return null;
  }

  return (
    <div className={classNames(className, styles.messageItem)}>
      <MessageChild
        value={value}
        debug={debug}
        status={status}
        isLastMessage={isLastMessage}
        addToolApprovalResponse={addToolApprovalResponse}
      />
    </div>
  );
}

function useStableArray<T>(arr: T[]): T[] {
  const ref = React.useRef<T[]>(arr);

  if (ref.current.length !== arr.length || ref.current.some((val, idx) => val !== arr[idx])) {
    ref.current = arr;
  }

  return ref.current;
}

function MessageChild({
  value,
  debug,
  status,
  isLastMessage,
  addToolApprovalResponse,
}: {
  value: UIMessage;
  debug: boolean;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  isLastMessage: boolean;
  addToolApprovalResponse?: ApprovalResponseFn | null;
}): React.ReactNode {
  const { setPanelWidth } = usePanelWidth();
  const deferredParts = React.useDeferredValue(value.parts);
  const memoizedStorageIds = React.useMemo(
    () => extractStorageIdsFromMessage(deferredParts),
    [deferredParts]
  );
  const validStorageIds = useStableArray(memoizedStorageIds);

  const {
    hasEditStateCalls,
    canRestore,
    handlePreviewRestore,
    handleConfirmRestore,
    handleCancelRestore,
  } = useMessageDiffs({ message: value });

  switch (value.role) {
    case 'user':
      return (
        <div className={styles.user}>
          <div className={styles.userContent}>
            <div>{value.parts.map((part) => part.type === 'text' && part.text)}</div>
            {value.parts.filter(isFileUIPart).map((part, idx) => {
              if (part.mediaType === 'application/pdf') {
                return (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={`file-${idx}`}
                    className={styles.pdfAttachment}
                  >
                    <span className={styles.pdfIcon}>
                      <RiFileLine size={28} />
                    </span>
                    <span className={styles.pdfName}>{part.filename ?? 'document.pdf'}</span>
                  </div>
                );
              }
              if (part.mediaType?.startsWith('image/')) {
                return part.url.startsWith('storage://') ? (
                  <StorageImagePart
                    // eslint-disable-next-line react/no-array-index-key
                    key={`file-${idx}`}
                    url={part.url}
                    filename={part.filename}
                  />
                ) : (
                  <ExpandableImage
                    // eslint-disable-next-line react/no-array-index-key
                    key={`file-${idx}`}
                    src={part.url}
                    alt={part.filename ?? 'Attached image'}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      );
    case 'assistant': {
      const children = deferredParts.map((part, index) => {
        if (part.type === 'text' && part.text !== '') {
          return (
            <GithubFlavorMarkdown
              // eslint-disable-next-line react/no-array-index-key
              key={`text-${index}`}
              className={styles.markdown}
              onLinkClicked={(external) => {
                if (!external) setPanelWidth(MINIMAL_PANEL_SIZE);
              }}
              validStorageIds={validStorageIds}
              isStreaming={isLastMessage && status === 'streaming'}
            >
              {part.text}
            </GithubFlavorMarkdown>
          );
        }
        if (isToolUIPart(part)) {
          return (
            <div key={`tool-${part.toolCallId}`}>
              <ToolsProgress part={part} addToolApprovalResponse={addToolApprovalResponse} />
            </div>
          );
        }
        return null;
      });

      return (
        <div className={styles.assistant}>
          <CollapsibleMessage
            message={value}
            status={isLastMessage ? status : 'ready'}
            onPreviewRestore={handlePreviewRestore}
            onConfirmRestore={handleConfirmRestore}
            onCancelRestore={handleCancelRestore}
            hasEditStateCalls={hasEditStateCalls && canRestore}
          >
            {children}
          </CollapsibleMessage>
          <div className={styles.backupPlotsWrapper}>
            <BackupPlotsWrapper message={value} isLastMessage={isLastMessage} status={status} />
          </div>
          {debug && (
            <button
              type="button"
              className={styles.debugButton}
              onClick={() => {
                debugToConsole(value);
              }}
            >
              Debug...
            </button>
          )}
        </div>
      );
    }
    default:
      return <pre>{JSON.stringify(value, null, '  ')}</pre>;
  }
}

function debugToConsole(value: UIMessage) {
  // eslint-disable-next-line no-console
  console.log(value);
  for (const part of value.parts) {
    if (!isToolUIPart(part)) continue;

    // eslint-disable-next-line no-console
    console.debug(`%c${getToolName(part)}`, 'font-weight: bolder; font-size: 110%');
    // eslint-disable-next-line no-console
    console.debug(part.output);
  }
}

function useDebug(): boolean {
  const [debug, setDebug] = React.useState(false);
  React.useEffect(() => setDebug(window.localStorage.getItem('DEBUG') === '1'), []);
  return debug;
}
