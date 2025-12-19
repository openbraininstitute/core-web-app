const DEFAULT_ERROR_MESSAGE = 'An unknown error occurred, please try again later';

/*
 * Returns the error message for the given error code.
 * If the error code is not found, returns the default error message.
 */
export function getErrorMessage(
  errorCode: string | undefined,
  errorRegistry: Record<string, string>,
  defaultMessage: string = DEFAULT_ERROR_MESSAGE,
) {
  if (!errorCode) return defaultMessage;
  return errorRegistry[errorCode] ?? defaultMessage;
}
