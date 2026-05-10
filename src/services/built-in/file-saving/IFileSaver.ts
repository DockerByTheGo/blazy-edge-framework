import type { IResultable, Optionable } from "@blazyts/better-standard-library";

export type IFileSaver = {

  saveIfNotExists: (
    relativePath: string,
    payload: Buffer | string,
    options?: SaveIfNotExistsOptions,
  ) => Promise<IResultable<{ path: string }, ["already-exists", "failed"]>>;

  exists: (file: File) => Promise<Optionable<string>>;
} & Service;
