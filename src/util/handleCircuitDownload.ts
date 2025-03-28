import { CircuitSchemaProps } from '@/components/explore-section/Circuit/type';

const handleCircuitDownload = (rows: CircuitSchemaProps[]): void => {
  if (typeof window === 'undefined') return; // Ensure client-side only

  const downloadNextFile = (index: number) => {
    if (index >= rows.length) return; // All files processed

    const row = rows[index];
    const fileName = row.name || 'unnamed';
    const files = Array.isArray(row.files) ? row.files : [];

    if (files.length === 0) {
      downloadNextFile(index + 1); // Move to next row if no files
      return;
    }

    files.forEach((file, fileIndex) => {
      if (file?.url) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = file.url;
          link.download = file.url || fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Delay between downloads to avoid browser blocking
          if (fileIndex === files.length - 1) {
            setTimeout(() => downloadNextFile(index + 1), 100); // Move to next row
          }
        }, fileIndex * 100); // Stagger files within the same row
      }
    });
  };

  // Start downloading from the first row
  downloadNextFile(0);
};

export default handleCircuitDownload;
