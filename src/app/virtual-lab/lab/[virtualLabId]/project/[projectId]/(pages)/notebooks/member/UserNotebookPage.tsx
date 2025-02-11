'use client';

import { Tag } from 'antd/lib';

import { Input, Modal } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import NotebookTable from '../NotebookTable';
import { NotebookSchema } from '../schemas';
import { fetchNotebook, Notebook } from '@/util/virtual-lab/github';
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
}: {
  initialNotebooks: Notebook[];
  projectId: string;
  vlabId: string;
}) {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [openModal, setOpenModal] = useState(false);
  const [step, setStep] = useState(0);
  const [notebookUrl, setNotebookUrl] = useState('');
  const [notebook, setNotebook] = useState<Omit<Notebook, 'id' | 'creationDate'> | null>(null);
  const [loading, setLoading] = useDelayedLoading(false);
  const [deleteNotebookId, setDeleteNotebookId] = useState('');

  const resetModal = () => {
    setOpenModal(false);
    setStep(0);
    setNotebookUrl('');
    setNotebook(null);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (loading) return;

    setLoading(true);

    try {
      const res = await authFetch(`${virtualLabApi.url}/projects/${projectId}/notebooks/${id}/`, {
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

    setNotebooks(notebooks.filter((n) => n.id === id));
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
      <Modal open={openModal} onCancel={resetModal} footer={false} width="40vw">
        {step === 0 && (
          <>
            <div className="mb-2 text-lg font-bold text-primary-8">Add a notebook</div>
            <div className="text-sm text-gray-500">
              <div>
                Ensure the url points to a github folder containing{' '}
                <code className="ml-1 mr-1 text-xs">analysis_notebook.ipynb</code> and{' '}
                <code className="ml-1 mr-1 text-xs">analys_info.json</code>
              </div>

              <div className="mt-2">
                Ensure the folder path contains the scale and notebook name e.g
                <code className="ml-1 text-xs">
                  <span>
                    https://github.com/openbraininstitute/obi_platform_analysis_notebooks/tree/main/
                  </span>
                  <strong>Cellular</strong>
                  <strong>/display_morphology_population_features</strong>
                </code>
              </div>
            </div>
            <div className="mb-5 mt-5">
              <div className="mb-3 font-bold text-primary-8">Github url</div>
              <Input
                onChange={(e) => setNotebookUrl(e.currentTarget.value)}
                onInput={(e) => setNotebookUrl(e.currentTarget.value)}
                placeholder="Paste your url here"
              />
              <div className="-mb-6 mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded bg-primary-8 p-2 text-white"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setNotebook(await fetchNotebook(notebookUrl.trim()));
                      setStep(1);
                    } catch (e) {
                      notification.error(assertErrorMessage(e));
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Add notebok
                </button>
                {loading && <LoadingOutlined />}
                <button type="button" onClick={resetModal}>
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="mb-5 mt-5">
            <div className="mb-3 font-bold text-primary-8">Register notebook</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-primary-8">Name</span>
                <Tag className="h-[30px] max-w-fit p-1">{notebook?.name}</Tag>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-primary-8">Github folder url</span>
                <Tag className="h-[40px] max-w-fit overflow-x-scroll p-1">{notebookUrl}</Tag>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-primary-8">Inputs</span>
                {notebook?.objectOfInterest.split(',').map((t) => (
                  <Tag className="max-w-fit" key={notebook.path + t}>
                    {t}
                  </Tag>
                ))}
              </div>
            </div>
            <div className="-mb-6 mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded bg-primary-8 p-2 text-white"
                onClick={async () => {
                  if (!notebook) return;
                  setLoading(true);

                  try {
                    const notebookRes = await authFetch(
                      `${virtualLabApi.url}/projects/${projectId}/notebooks/`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ github_file_url: notebookUrl }),
                      }
                    );

                    const newNotebook = await assertVLApiResponse(notebookRes);
                    const newValidatedNotebook = NotebookSchema.parse(newNotebook);
                    setNotebooks([
                      ...notebooks,
                      {
                        ...notebook,
                        id: newValidatedNotebook.id,
                        creationDate: newValidatedNotebook.created_at,
                      },
                    ]);
                  } catch (e) {
                    notification.error('Unknown error, please try again.');
                    resetModal();
                    return;
                  }

                  resetModal();
                }}
              >
                Register notebook
                {loading && <LoadingOutlined />}
              </button>

              <button type="button" onClick={resetModal}>
                Cancel
              </button>
            </div>
          </div>
        )}
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
        Add a notebook
      </button>
    </>
  );
}
