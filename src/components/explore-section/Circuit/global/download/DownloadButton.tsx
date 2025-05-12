export default function DownloadButton({
  totalFileSize,
  totalFileNumber,
}: {
  totalFileSize: number;
  totalFileNumber: number;
}) {
  let unit = 'MB';
  let displaySize = totalFileSize;

  if (totalFileSize >= 1000000) {
    unit = 'TB';
    displaySize = totalFileSize / 1000000;
  } else if (totalFileSize >= 1000) {
    unit = 'GB';
    displaySize = totalFileSize / 1000;
  }

  return (
    <button
      type="button"
      className="bg-white px-6 py-5"
      aria-label="Download Circuit files"
      onClick={
        () => console.log('Download button clicked') /* TODO: Implement download functionality */
      }
    >
      <div>Download ${totalFileNumber} files</div>
      <div>
        {displaySize} {unit}
      </div>
    </button>
  );
}
