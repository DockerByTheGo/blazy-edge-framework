import type { OptionalPromise, SimpleResult } from "@blazyts/better-standard-library";

export type SaveIfNotExistsOptions = {
  encoding?: BufferEncoding;
};

export type SaveIfNotExistsResult = SimpleResult<
  { path: string },
  "already-exists" | "failed"
>;
export type FileExistsResult = SimpleResult<{ path: string | null }, "failed">;

export type IFileSaver = {
  config: Record<string, unknown>;

  saveIfNotExists: (
    relativePath: string,
    payload: Buffer | string,
    options?: SaveIfNotExistsOptions,
  ) => Promise<SaveIfNotExistsResult>;

  exists: (file: File | string) => OptionalPromise<FileExistsResult>;
};
