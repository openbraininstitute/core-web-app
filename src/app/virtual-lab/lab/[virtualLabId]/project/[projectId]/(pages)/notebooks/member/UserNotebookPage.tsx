'use client';

import { Input, Modal } from 'antd';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import NotebookTable from '../NotebookTable';
import { NotebooksArraySchema } from '../schemas';
import { Notebook } from '@/util/virtual-lab/github';
import fetchNotebooks from '@/util/virtual-lab/fetchNotebooks';
import authFetch from '@/authFetch';
import { notification } from '@/api/notifications';
import { assertErrorMessage, assertVLApiResponse } from '@/util/utils';
import { virtualLabApi } from '@/config';

function useDelayedLoading(initialValue = false, delay = 200) {
  const [loading, setLoading] = useState<boolean>(initialValue);
  const timeoutRef = useRef<number | null>(null);

  const setDelayedLoading = (newValue: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (newValue) {
      timeoutRef.current = window.setTimeout(() => {
        setLoading(true);
      }, delay);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [loading, setDelayedLoading] as const;
}

export default function UserNotebookPage({
  initialNotebooks,
  projectId,
  vlabId,
  serverError,
}: {
  initialNotebooks: Notebook[];
  projectId: string;
  vlabId: string;
  serverError?: string;
}) {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [openModal, setOpenModal] = useState(false);
  const [step, setStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState('');
  const [newNotebooks, setNewNotebooks] = useState<Omit<Notebook, 'id' | 'creationDate'>[] | null>(
    null
  );
  const [loading, setLoading] = useDelayedLoading(false);
  const [deleteNotebookId, setDeleteNotebookId] = useState('');

  if (serverError)
    notification.error(serverError, undefined, undefined, undefined, 'user-notebook-server-error');

  const resetModal = () => {
    setOpenModal(false);
    setStep(0);
    setRepoUrl('');
    setNewNotebooks(null);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (loading) return;

    setLoading(true);

    try {
      const res = await authFetch(`${virtualLabApi.url}/projects/${projectId}/notebooks/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        notification.error('There was an error deregistering the notebook, please try again');
        setDeleteNotebookId('');
        return;
      }
    } catch {
      notification.error('There was an error deregistering the notebook, please try again');
      setDeleteNotebookId('');
      return;
    }

    setNotebooks(notebooks.filter((n) => n.id !== id));
    setDeleteNotebookId('');
    setLoading(false);
  };

  return (
    <>
      <NotebookTable
        notebooks={notebooks}
        onDelete={(id: string) => setDeleteNotebookId(id)}
        projectId={projectId}
        vlabId={vlabId}
      />
      <Modal open={openModal} onCancel={resetModal} footer={false} width="35vw">
        <div className="p-4">
          <div className="text-xl font-bold text-primary-8">Register notebooks</div>
          {step === 0 && (
            <div className="mb-5 mt-5">
              <p className="mb-5">
                Contribute and share your own analysis notebooks with your collaborators. Provide
                the url of a code repository containing the notebooks and they will be available in
                your virtual lab for all members. The repository must be structured according to the
                following{' '}
                <Link href="spec" className="text-primary-8 underline">
                  specifications.
                </Link>
              </p>
              <div className="mb-3 font-bold text-primary-8">Github url</div>
              <Input
                onChange={(e) => setRepoUrl(e.currentTarget.value)}
                onInput={(e) => setRepoUrl(e.currentTarget.value)}
                placeholder="Paste your url here"
              />
              <div className="-mb-6 mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded bg-primary-8 p-2 text-white"
                  onClick={async () => {
                    try {
                      setLoading(true);

                      const { notebooks: fetchedNotebooks, error } = await fetchNotebooks(
                        repoUrl.trim()
                      );
                      if (error) throw new Error(error);
                      setNewNotebooks(fetchedNotebooks);
                      setStep(1);
                    } catch (e) {
                      notification.error(assertErrorMessage(e));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Register notebooks
                </button>
                {loading && <LoadingOutlined />}
                <button type="button" onClick={resetModal}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mb-5 mt-5">
              {newNotebooks?.map((notebook, i) => {
                return (
                  <div key={notebook.key} className="mb-10">
                    <div className="mb-3 text-lg text-gray-600">{i + 1}</div>
                    <div className="mb-3 flex justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-gray-400">Name</div>
                        <div className="max-w-fit font-bold text-primary-8">{notebook?.name}</div>
                      </div>

                      <div className="flex-1">
                        <div className="mb-2 text-sm text-gray-400">Inputs</div>
                        <div>
                          {notebook?.objectOfInterest.split(',').map((t) => (
                            <span
                              className="mr-1 max-w-fit rounded-3xl border border-gray-200 px-2 py-1 text-xs text-primary-8"
                              key={notebook.path + t}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mb-10">
                      <div className="mb-1 text-sm text-gray-400">Description</div>
                      <div className="text-sm">{notebook.description}</div>
                    </div>
                  </div>
                );
              })}
              <div className="-mb-6 mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded bg-primary-8 px-3 py-2 text-white"
                  onClick={async () => {
                    if (!newNotebooks) return;
                    setLoading(true);

                    try {
                      const notebookRes = await authFetch(
                        `${virtualLabApi.url}/projects/${projectId}/notebooks/bulk_create/`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            notebooks: newNotebooks.map((n) => {
                              return {
                                github_file_url: `https://github.com/${n.githubUser}/${n.githubRepo}/tree/${n.defaultBranch}/${n.path}`,
                              };
                            }),
                          }),
                        }
                      );

                      const newNotebook = await assertVLApiResponse(notebookRes);

                      const newValidatedNotebooks = NotebooksArraySchema.parse(newNotebook.data);
                      setNotebooks([
                        ...notebooks,
                        ...newNotebooks.map((n, i) => {
                          return {
                            ...n,
                            id: newValidatedNotebooks[i].id,
                            creationDate: newValidatedNotebooks[i].created_at,
                          };
                        }),
                      ]);
                    } catch (e) {
                      notification.error(assertErrorMessage(e));
                      resetModal();
                      return;
                    }

                    resetModal();
                  }}
                >
                  Register{' '}
                  <span className="ml-1 text-sm text-primary-3">({newNotebooks?.length})</span>
                  {loading && <LoadingOutlined />}
                </button>

                <button type="button" onClick={resetModal}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        open={!!deleteNotebookId}
        onCancel={() => setDeleteNotebookId('')}
        onOk={() => handleDelete(deleteNotebookId)}
        confirmLoading={loading}
      >
        <div>
          This will deresgister the notebook for all project members. Do you wish to proceed?
        </div>
      </Modal>
      <button
        type="button"
        className="fixed bottom-10 right-10 h-[50px] w-[200px] bg-white text-primary-8"
        onClick={() => setOpenModal(true)}
      >
        <span className="mr-5 font-semibold">Register notebooks</span>
        <UploadOutlined />
      </button>
    </>
  );
}
