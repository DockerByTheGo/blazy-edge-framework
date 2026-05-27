export type ServiceResult<TValue, TError extends string> =
  | {
      isOk: () => true;
      isError: () => false;
      value: TValue;
      unpack: () => TValue;
    }
  | {
      isOk: () => false;
      isError: () => true;
      error: TError;
      unpack: () => never;
    };

export type SaveIfNotExistsOptions = {
  encoding?: BufferEncoding;
};

export type SaveIfNotExistsResult = ServiceResult<
  { path: string },
  "already-exists" | "failed"
>;

export type IFileSaver = {
  config: Record<string, unknown>;

  saveIfNotExists: (
    relativePath: string,
    payload: Buffer | string,
    options?: SaveIfNotExistsOptions,
  ) => Promise<SaveIfNotExistsResult>;

  exists: (file: File) => Promise<string | null>;
};
