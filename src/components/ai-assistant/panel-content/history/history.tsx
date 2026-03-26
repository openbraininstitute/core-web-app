'use client';

import React from 'react';

import IconPlus from '@/components/icons/Plus';
import Tooltip from '@/components/tooltip';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';

import { IconDelete } from '../../icons/delete';
import { IconEdit } from '../../icons/edit';
import TabTransitionLoader from '../tab-transition-loader/tab-transition-loader';
import DialogDelete from './dialog-delete';
import DialogEdit from './dialog-edit';
import { useSections } from './hooks';
import Search from './search';

import styles from './history.module.css';

export interface HistoryProps {
  className?: string;
  onBack(): void;
}

export default function History({ className, onBack }: HistoryProps) {
  const assistant = useAiAssistant();
  const [threadId, setThreadId] = assistant.threadId.use();
  const [history, hasMore, fetchNextPage, isLoading] = assistant.useHistory();
  const sections = useSections(history);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [currentThreadId, setCurrentThreadId] = React.useState<string | undefined>(undefined);
  const [currentThreadTitle, setCurrentThreadTitle] = React.useState<string | undefined>(undefined);

  const handleRename = (newThreadId: string, newTitle: string) => {
    setOpenEdit(false);
    assistant.renameThread(newThreadId, newTitle);
  };

  const handleNext = () => {
    fetchNextPage();
  };

  const handleSelectThread = (selectedThreadId: string) => {
    assistant.isEmptyThread.set(false);
    setThreadId(selectedThreadId);
    onBack();
  };

  return (
    <>
      <div className={classNames(className, styles.history)}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>History</span>
          <div className={styles.headerSearch}>
            <Search onSelectThread={handleSelectThread} />
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onBack}
            aria-label="Close history"
            title="Close history"
          >
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <TabTransitionLoader message="Loading conversation history..." />
          ) : (
            <>
              {history && (
                <div>
                  {
                    sections.reduce<{ nodes: React.ReactNode[]; count: number }>(
                      (acc, { title, list }) => {
                        if (list.length === 0) return acc;
                        acc.nodes.push(
                          <div key={title}>
                            <h1
                              style={{ '--index': Math.min(acc.count, 20) } as React.CSSProperties}
                            >
                              {title}
                            </h1>
                            {list.map((thread) => {
                              const idx = acc.count++;
                              return (
                                <div
                                  className={classNames(
                                    styles.card,
                                    threadId === thread.id && styles.currentThread
                                  )}
                                  key={thread.id}
                                  style={{ '--index': Math.min(idx, 20) } as React.CSSProperties}
                                >
                                  <Tooltip tooltip="Rename this thread" arrow="topLeft">
                                    <button
                                      type="button"
                                      className={styles.edit}
                                      onClick={() => {
                                        setCurrentThreadId(thread.id);
                                        setCurrentThreadTitle(thread.title);
                                        setOpenEdit(true);
                                      }}
                                    >
                                      <IconEdit />
                                    </button>
                                  </Tooltip>
                                  <button
                                    key={thread.id}
                                    type="button"
                                    className={styles.mainButton}
                                    onClick={() => {
                                      assistant.isEmptyThread.set(false);
                                      setThreadId(thread.id);
                                      onBack();
                                    }}
                                  >
                                    <Tooltip tooltip="Click to recover this thread">
                                      {thread.title}
                                    </Tooltip>
                                  </button>
                                  <Tooltip
                                    tooltip="Delete this thread permanently"
                                    arrow="topRight"
                                  >
                                    <button
                                      type="button"
                                      className={styles.delete}
                                      onClick={() => {
                                        setCurrentThreadId(thread.id);
                                        setCurrentThreadTitle(thread.title);
                                        setOpenDelete(true);
                                      }}
                                    >
                                      <IconDelete />
                                    </button>
                                  </Tooltip>
                                </div>
                              );
                            })}
                          </div>
                        );
                        return acc;
                      },
                      { nodes: [], count: 0 }
                    ).nodes
                  }
                </div>
              )}
              {hasMore && (
                <div className={styles.loadMore}>
                  <button type="button" onClick={handleNext}>
                    <IconPlus />
                    <div>Load more</div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <DialogEdit
        open={openEdit}
        threadId={currentThreadId}
        threadTitle={currentThreadTitle ?? 'Chat'}
        onCancel={() => setOpenEdit(false)}
        onValidate={handleRename}
      />
      <DialogDelete
        open={openDelete}
        threadId={currentThreadId}
        threadTitle={currentThreadTitle ?? 'Chat'}
        onClose={() => setOpenDelete(false)}
      />
    </>
  );
}
