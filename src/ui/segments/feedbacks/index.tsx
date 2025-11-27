'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import ChevronDownIcon from '@/components/icons/ChevronDownIcon';
import { Loader } from '@/components/loader';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type FeedbackFormProps = {
  onClose: () => void;
};

export default function FeedbackForm({ onClose }: FeedbackFormProps) {
  const [type, setType] = useState('');
  const [section, setSection] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [mounted, setMounted] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ type?: string; feedback?: string }>({});

  const { virtualLabId, projectId } = useWorkspace();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (type !== 'bugs' && uploadedImages.length > 0) {
      setUploadedImages([]);
    }
  }, [type, uploadedImages.length]);

  const imageUrls = useMemo(() => {
    return uploadedImages.map((file) => URL.createObjectURL(file));
  }, [uploadedImages]);

  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const { pathname, search, origin } = window.location;
      const searchParams = new URLSearchParams(search);
      const url = `${origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      setCurrentUrl(url);
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && !section) {
      const { pathname } = window.location;

      const pathSegments = pathname.split('/').filter(Boolean);
      const virtualLabIndex = pathSegments.indexOf('virtual-lab');

      if (virtualLabIndex !== -1) {
        // Check if there's a section after the project ID
        if (virtualLabIndex + 3 < pathSegments.length) {
          const sectionFromUrl = pathSegments[virtualLabIndex + 3];

          if (sectionFromUrl) {
            const sectionMap: Record<string, string> = {
              workflows: 'workflows',
              notebooks: 'notebooks',
              reports: 'reports',
              data: 'data',
              help: 'help',
            };

            const mappedSection = sectionMap[sectionFromUrl.toLowerCase()];
            if (mappedSection) {
              setSection(mappedSection);
            }
          }
        } else {
          // If we're on the project home (no section after project ID), set default to "Projects"
          setSection('projects');
        }
      }
    }
  }, [mounted, section]);

  const { data: projectData } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
    enabled: mounted && Boolean(virtualLabId && projectId),
    retry: false,
  });

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab(virtualLabId),
    enabled: mounted && Boolean(virtualLabId),
    retry: false,
  });

  const projectName = projectData?.data?.project?.name ?? '';
  const virtualLabName = virtualLabData?.data?.virtual_lab?.name ?? '';

  const getMonthYearLabel = () => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = now.getFullYear();
    return `${month}-${year}`;
  };

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    setUploadedImages((prev) => [...prev, ...imageFiles]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      const modalOverlay = document.querySelector('.ant-modal-mask') as HTMLElement;

      const originalModalDisplay = modal?.style.display;
      const originalOverlayDisplay = modalOverlay?.style.display;

      if (modal) modal.style.display = 'none';
      if (modalOverlay) modalOverlay.style.display = 'none';

      const domtoimage = await import('dom-to-image');

      const dataUrl = await domtoimage.toPng(document.body, {
        quality: 0.9,
        width: window.innerWidth,
        height: window.innerHeight,
        filter: (node: Node) => {
          if (node instanceof HTMLElement) {
            const role = node.getAttribute('role');
            if (role === 'dialog' || node.classList.contains('ant-modal')) {
              return false;
            }
          }
          return true;
        },
      });

      if (modal) modal.style.display = originalModalDisplay || '';
      if (modalOverlay) modalOverlay.style.display = originalOverlayDisplay || '';

      return dataUrl;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Screenshot capture unavailable.', error);
      }

      const modal = document.querySelector('[role="dialog"]') as HTMLElement;
      const modalOverlay = document.querySelector('.ant-modal-mask') as HTMLElement;
      if (modal) modal.style.display = '';
      if (modalOverlay) modalOverlay.style.display = '';

      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: { type?: string; feedback?: string } = {};
    if (!type.trim()) {
      newErrors.type = 'This field is mandatory';
    }
    if (!feedback.trim()) {
      newErrors.feedback = 'This field is mandatory';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    setMessage('');

    let allScreenshots: string[] = [];
    if (type === 'bugs') {
      const uploadedScreenshots: string[] = [];
      for (const file of uploadedImages) {
        try {
          const base64 = await convertFileToBase64(file);
          uploadedScreenshots.push(base64);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to convert image to base64:', error);
        }
      }

      const screenshot = await captureScreenshot().catch(() => {
        return null;
      });
      allScreenshots = screenshot ? [screenshot, ...uploadedScreenshots] : uploadedScreenshots;
    }
    const title = feedback.substring(0, 60).trim() || `[${type.toUpperCase()}] in ${section}`;

    const body = `${feedback}\n\n---\n\n🗳️ Project: ${projectName}\n\n🏠 Virtual Lab: ${virtualLabName}\n\nURL: ${currentUrl}`;

    const labels = [type, section].filter(Boolean);

    try {
      // eslint-disable-next-line no-console
      console.log('Submitting feedback:', {
        title,
        body: body.substring(0, 100) + '...',
        label: getMonthYearLabel(),
      });

      const res = await fetch('/api/feedback/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          label: getMonthYearLabel(),
          labels,
          screenshot: allScreenshots.length > 0 ? allScreenshots[0] : null,
          screenshots: allScreenshots,
        }),
      });

      const responseData = await res.json().catch(() => ({ error: 'Failed to parse response' }));

      // eslint-disable-next-line no-console
      console.log('API response:', { status: res.status, data: responseData });

      if (!res.ok) {
        throw new Error(responseData.error || 'Failed to create ticket');
      }

      if (responseData.warning) {
        // eslint-disable-next-line no-console
        console.warn('Warning:', responseData.warning);
      }

      setMessage(`Ticket created: ${responseData.issueUrl}`);

      setType('');
      setSection('');
      setFeedback('');
      setUploadedImages([]);

      setTimeout(() => {
        onClose();
        setMessage('');
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error creating ticket';
      setMessage(`Error: ${errorMessage}`);
      // eslint-disable-next-line no-console
      console.error('Error creating ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col p-6">
        <div className="border-neutral-2 mb-6 flex items-start justify-between border-b pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary-9 text-2xl font-bold">Submit Feedback</h2>
            <p className="text-neutral-5 text-base">
              Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-neutral-4 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col p-6">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <Loader size="large" className="text-primary-9" />
        </div>
      )}

      <div
        className={cn(
          'border-neutral-2 mb-6 flex items-start justify-between border-b pb-4',
          loading && 'pointer-events-none opacity-40 blur-sm'
        )}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-primary-9 text-2xl font-bold">Submit Feedback</h2>
          <p className="text-neutral-5 text-base">
            Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="hover:bg-neutral-1 h-8 w-8 p-0"
          disabled={loading}
        >
          <CloseOutlined className="text-lg" />
        </Button>
      </div>

      <form
        onSubmit={handleSubmit}
        className={cn('flex flex-col gap-6', loading && 'pointer-events-none opacity-40 blur-sm')}
      >
        <div className="grid grid-cols-2 gap-4">
          <label htmlFor="type" className="flex flex-col gap-2">
            <span className={cn("text-base font-normal", errors.type ? "text-red-500" : "text-primary-9")}>
              Feedback type
              <span className="ml-1 text-red-500">*</span>
            </span>
            <div className="relative">
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setType(newValue);
                  if (errors.type && newValue.trim()) {
                    setErrors((prev) => ({ ...prev, type: undefined }));
                  }
                }}
                required
                className={cn(
                  'border-neutral-2 text-primary-9 w-full rounded-lg border text-lg font-semibold',
                  'focus:border-primary-4 focus:ring-primary-4/20 rounded-full bg-white focus:ring-2 focus:outline-none',
                  'appearance-none py-3 pr-12 pl-6',
                  !type && 'text-neutral-5 text-base font-normal',
                  errors.type && 'border-red-500'
                )}
              >
                <option value="" disabled className="text-neutral-5 text-base font-normal">
                  Select your feedback type...
                </option>
                <option value="enhancement">Enhancement</option>
                <option value="bugs">Bugs</option>
                <option value="new feature">New feature</option>
                <option value="payment">Payment</option>
                <option value="other">Other</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" />
            </div>
            {errors.type && (
              <p className="text-base font-normal text-red-500">{errors.type}</p>
            )}
          </label>

          <label htmlFor="section" className="flex flex-col gap-2">
            <span className="text-primary-9 text-base font-normal">Section</span>
            <div className="relative">
              <select
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
                className={cn(
                  'border-neutral-2 text-primary-9 w-full rounded-lg border text-lg font-semibold',
                  'focus:border-primary-4 focus:ring-primary-4/20 rounded-full bg-white focus:ring-2 focus:outline-none',
                  'appearance-none py-3 pr-12 pl-6',
                  !section && 'text-neutral-5 text-base font-normal'
                )}
              >
                <option value="" disabled className="text-neutral-5 text-base font-normal">
                  Select a section...
                </option>
                <option value="data">Data</option>
                <option value="projects">Projects</option>
                <option value="virtual lab">Virtual lab</option>
                <option value="workflows">Workflows</option>
                <option value="notebooks">Notebooks</option>
                <option value="help">Help</option>
                <option value="reports">Reports</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2" />
            </div>
          </label>
        </div>

        <label htmlFor="feedback" className="flex flex-col gap-2">
          <span className={cn("text-base font-normal", errors.feedback ? "text-red-500" : "text-primary-9")}>
            Your feedback
            <span className="ml-1 text-red-500">*</span>
          </span>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => {
              const newValue = e.target.value;
              setFeedback(newValue);
              if (errors.feedback && newValue.trim()) {
                setErrors((prev) => ({ ...prev, feedback: undefined }));
              }
            }}
            placeholder="Enter your feedback here..."
            required
            rows={6}
            className={cn(
              'border-neutral-2 text-primary-8 rounded-lg border px-3 py-2 text-lg',
              'focus:border-primary-4 focus:ring-primary-4/20 focus:ring-2 focus:outline-none',
              'resize-none',
              'placeholder:text-neutral-5 placeholder:text-base placeholder:font-normal',
              errors.feedback && 'border-red-500'
            )}
          />
          {errors.feedback && (
            <p className="text-base font-normal text-red-500">{errors.feedback}</p>
          )}
        </label>

        {type === 'bugs' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-primary-9 text-base font-normal">Screenshot(s)</span>
              <span className="text-neutral-5 text-sm">
                This is not mandatory but could help us understand your request
              </span>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                'border-neutral-2 rounded-lg border-2 border-dashed p-6 transition-colors',
                isDragging
                  ? 'border-primary-4 bg-primary-1'
                  : 'border-neutral-2 bg-neutral-0 hover:border-primary-3'
              )}
            >
              <label
                htmlFor="image-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2"
              >
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                  aria-label="Upload images"
                />
                <span className="text-primary-9 hover:text-primary-7 text-sm font-medium">
                  Click to upload or drag and drop
                </span>
                <span className="text-neutral-5 text-xs">PNG, JPG, GIF up to 10MB each</span>
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-4">
                {uploadedImages.map((file, index) => {
                  const fileKey = `${file.name}-${file.size}-${file.lastModified}-${index}`;
                  return (
                    <div key={fileKey} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrls[index]}
                        alt={`Preview ${index + 1}`}
                        className="border-neutral-2 h-32 w-full rounded-lg border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <CloseOutlined className="text-xs" />
                      </button>
                      <div className="absolute right-2 bottom-2 left-2 truncate rounded bg-black/50 px-2 py-1 text-xs text-white">
                        {file.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {message && (
          <div
            className={cn(
              'rounded-lg px-4 py-2 text-sm',
              message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            )}
          >
            {message}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-primary-9 border-none text-lg font-normal"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={loading}
            className="bg-primary-9 rounded-full px-20 py-8 text-xl font-semibold text-white"
          >
            {loading ? 'Sending...' : 'Send Feedback'}
          </Button>
        </div>
      </form>
    </div>
  );
}
