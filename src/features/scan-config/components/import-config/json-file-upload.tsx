'use client';

import { RiFileTextLine, RiUploadCloud2Line } from '@remixicon/react';
import { useCallback, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

interface JsonFileUploadProps {
  onFileContent: (content: string, fileName: string) => void;
}

export function JsonFileUpload({ onFileContent }: JsonFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      const reader = new FileReader();

      reader.onload = () => {
        const content = reader.result;
        if (typeof content === 'string') {
          onFileContent(content, file.name);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
      };

      reader.readAsText(file);
    },
    [onFileContent]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        readFile(file);
      }
    },
    [readFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        readFile(file);
      }
    },
    [readFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded border-2 border-dashed p-6 transition-colors',
          isDragOver && 'border-primary-8 bg-primary-0',
          !isDragOver && 'border-neutral-2 hover:border-neutral-4'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          onChange={handleInputChange}
          className="hidden"
        />

        {fileName ? (
          <>
            <RiFileTextLine className="size-8 text-primary-8" />
            <span className="text-sm font-medium">{fileName}</span>
          </>
        ) : (
          <>
            <RiUploadCloud2Line className="size-8 text-neutral-4" />
            <span className="text-sm text-neutral-4">
              Drop a .json file here or click to browse
            </span>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
