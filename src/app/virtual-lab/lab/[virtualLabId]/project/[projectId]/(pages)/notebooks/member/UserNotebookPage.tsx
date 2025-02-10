'use client';

import { Tag } from 'antd/lib';
import { z } from 'zod';

import { Input, Modal } from 'antd';
import { useState, useEffect, useRef } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import NotebookTable from '../NotebookTable';
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
}: {
  initialNotebooks: Notebook[];
  projectId: string;
}) {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [openModal, setOpenModal] = useState(false);
  const [step, setStep] = useState(0);
  const [notebookUrl, setNotebookUrl] = useState('');
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useDelayedLoading(false);

  const resetModal = () => {
    setOpenModal(false);
    setStep(0);
    setNotebookUrl('');
    setNotebook(null);
    setLoading(false);
  };

  return (
    <>
      <NotebookTable notebooks={notebooks} />
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
                    NotebookSchema.parse(newNotebook);
                  } catch (e) {
                    notification.error('Unknown error, please try again.');
                    resetModal();
                    return;
                  }

                  setNotebooks([...notebooks, notebook]);

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

const NotebookSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  github_file_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
