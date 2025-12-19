'use client';

import React from 'react';
import IconPlus from '@/components/icons/Plus';
import Tooltip from '@/components/tooltip';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';
import { IconDelete } from '../../icons/delete';
import { IconEdit } from '../../icons/edit';
import DialogDelete from './dialog-delete';
import DialogEdit from './dialog-edit';
import styles from './history.module.css';
import { useSections } from './hooks';

export interface HistoryProps {
  className?: string;
  onBack(): void;
}

export default function History({ className, onBack }: HistoryProps) {
  const assistant = useAiAssistant();
  const [threadId, setThreadId] = assistant.threadId.use();
  const [history, hasMore, next] = assistant.useHistory();
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
    next();
  };

  return (
    <>
      <div className={classNames(className, styles.history)}>
        <div>
          {history && (
            <div>
              {sections.map(
                ({ title, list }) =>
                  list.length > 0 && (
                    <div key={title}>
                      <h1>{title}</h1>
                      {list.map((thread) => (
                        <div
                          className={classNames(
                            styles.card,
                            threadId === thread.id && styles.currentThread,
                          )}
                          key={thread.id}
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
                              setThreadId(thread.id);
                              onBack();
                            }}
                          >
                            <Tooltip tooltip="Click to recover this thread">{thread.title}</Tooltip>
                          </button>
                          {threadId !== thread.id && (
                            <Tooltip tooltip="Delete this thread permanently" arrow="topRight">
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
                          )}
                        </div>
                      ))}
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
        {hasMore && (
          <div className={styles.loadMore}>
            <button type="button" onClick={handleNext}>
              <IconPlus />
              <div>Load more</div>
            </button>
          </div>
        )}
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
