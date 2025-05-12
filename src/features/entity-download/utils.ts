import { Readable } from 'stream';

/**
 * Generates headers for a file download stream.
 *
 * @param {Object} params - The parameters for generating download headers.
 * @param {string} params.filename - The name of the file to be downloaded.
 * @returns {Object} An object containing Content-Type and Content-Disposition headers for file download.
 */
export function getDownloadStreamHeaders({ filename }: { filename: string }) {
  return {
    'Content-Type': 'application/gzip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
}

/**
 * Converts a readable stream to a buffer by collecting all chunks.
 *
 * @param {Readable} readable - The input readable stream to be buffered
 * @returns {Promise<Buffer>} A promise that resolves to a concatenated buffer containing all stream chunks
 *
 * @description
 * - Handles both string and buffer chunks
 * - Converts string chunks to buffers if necessary
 * - Concatenates all chunks into a single buffer
 */
export async function bufferStream(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}
