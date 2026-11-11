import { serviceAiAgentUrl } from './url';

import type { FileUIPart } from 'ai';

/**
 * Upload files to S3 and return FileUIPart[] with storage:// URLs.
 * Each file gets a UUID, is uploaded via presigned URL, and the
 * resulting FileUIPart uses storage://<uuid> as the url field.
 */
export async function uploadFilesAndCreateParts(
  files: File[],
  accessToken: string,
  threadId: string
): Promise<FileUIPart[]> {
  return Promise.all(
    files.map(async (file) => {
      const uuid = crypto.randomUUID();

      // Get presigned upload URL
      const presignedRes = await fetch(serviceAiAgentUrl(`storage/${uuid}/presigned-url`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: file.type,
          threadId,
        }),
      });
      if (!presignedRes.ok) throw new Error('Failed to get upload URL');
      const presignedUrl = await presignedRes.json();

      // Upload file to S3
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file');

      return {
        type: 'file' as const,
        filename: file.name,
        mediaType: file.type,
        url: `storage://${uuid}`,
      };
    })
  );
}
