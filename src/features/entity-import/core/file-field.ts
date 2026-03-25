import { formatBytes } from '@/utils/format';

import type { AdapterFieldDefinition, ImportFileFieldConfig } from './adapter';

const DEFAULT_FILE_BUTTON_LABEL = 'Add file(s)';
const DEFAULT_MAX_FILES = 1;

function normalizeFileConfig(
  fileConfig?: ImportFileFieldConfig
): Required<Pick<ImportFileFieldConfig, 'accept' | 'allowedExtensions'>> &
  Omit<ImportFileFieldConfig, 'accept' | 'allowedExtensions'> {
  return {
    accept: fileConfig?.accept ?? [],
    allowedExtensions: fileConfig?.allowedExtensions ?? [],
    maxSizeBytes: fileConfig?.maxSizeBytes,
    maxFiles: fileConfig?.maxFiles ?? DEFAULT_MAX_FILES,
    buttonLabel: fileConfig?.buttonLabel,
  };
}

function normalizeExtension(extension: string): string {
  return extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

function matchesAcceptToken(file: File, token: string): boolean {
  const normalizedToken = token.trim().toLowerCase();
  if (!normalizedToken) {
    return false;
  }

  if (normalizedToken.startsWith('.')) {
    return file.name.toLowerCase().endsWith(normalizeExtension(normalizedToken));
  }

  if (normalizedToken.endsWith('/*')) {
    const fileTypeGroup = file.type.split('/')[0]?.toLowerCase();
    const tokenGroup = normalizedToken.slice(0, -2);
    return Boolean(fileTypeGroup && tokenGroup && fileTypeGroup === tokenGroup);
  }

  return file.type.toLowerCase() === normalizedToken;
}

export function buildFileAcceptValue(fileConfig?: ImportFileFieldConfig): string | undefined {
  const normalizedConfig = normalizeFileConfig(fileConfig);
  const tokens = [
    ...normalizedConfig.accept,
    ...normalizedConfig.allowedExtensions.map(normalizeExtension),
  ]
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.length > 0 ? [...new Set(tokens)].join(',') : undefined;
}

export function getImportFileButtonLabel(field: AdapterFieldDefinition): string {
  const normalizedConfig = normalizeFileConfig(field.fileConfig);
  if (normalizedConfig.buttonLabel?.trim()) {
    return normalizedConfig.buttonLabel.trim();
  }

  const allowedExtensions = normalizedConfig.allowedExtensions.map(normalizeExtension);
  if (allowedExtensions.length === 0) {
    return DEFAULT_FILE_BUTTON_LABEL;
  }

  return `${DEFAULT_FILE_BUTTON_LABEL} (${allowedExtensions.join(', ')})`;
}

export function getImportFileDisplayValue(files: Array<File>): string {
  if (files.length === 0) {
    return '';
  }

  if (files.length === 1) {
    return files[0]?.name ?? '';
  }

  return `${files.length} files selected`;
}

export function getImportFileMaxFiles(field?: AdapterFieldDefinition): number {
  return normalizeFileConfig(field?.fileConfig).maxFiles ?? DEFAULT_MAX_FILES;
}

export function getImportFileInputMultiple(field?: AdapterFieldDefinition): boolean {
  return getImportFileMaxFiles(field) > 1;
}

export function toFileArray(value: unknown): Array<File> {
  if (value instanceof File) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.filter((entry): entry is File => entry instanceof File);
  }

  return [];
}

export function toParsedFileValue(
  files: Array<File>,
  field?: AdapterFieldDefinition
): File | Array<File> | null {
  const maxFiles = getImportFileMaxFiles(field);
  if (files.length === 0) {
    return null;
  }

  return maxFiles > 1 ? files : (files[0] ?? null);
}

export function validateImportFiles({
  field,
  files,
}: {
  field?: AdapterFieldDefinition;
  files: Array<File>;
}): string | null {
  if (!field) {
    return null;
  }

  const normalizedConfig = normalizeFileConfig(field.fileConfig);

  if (files.length > normalizedConfig.maxFiles) {
    return `${field.label} accepts at most ${normalizedConfig.maxFiles} file${
      normalizedConfig.maxFiles === 1 ? '' : 's'
    }.`;
  }

  const acceptTokens = [
    ...normalizedConfig.accept,
    ...normalizedConfig.allowedExtensions.map(normalizeExtension),
  ].filter(Boolean);
  if (
    acceptTokens.length > 0 &&
    files.some((file) => !acceptTokens.some((token) => matchesAcceptToken(file, token)))
  ) {
    return `${field.label} files must match the allowed file types (${acceptTokens.join(', ')}).`;
  }

  if (
    normalizedConfig.maxSizeBytes !== undefined &&
    files.some((file) => file.size > normalizedConfig.maxSizeBytes)
  ) {
    return `${field.label} files must be ${formatBytes(normalizedConfig.maxSizeBytes)} or smaller.`;
  }

  return null;
}
