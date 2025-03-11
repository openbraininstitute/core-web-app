type Ok<T> = {
  data: T;
  error: null;
};

type Err<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Ok<T> | Err<E>;

export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
  onComplete?: Function
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  } finally {
    onComplete?.();
  }
}
