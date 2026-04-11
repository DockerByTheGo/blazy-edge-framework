import type { IResultable, Optionable } from "@blazyts/better-standard-library";

export interface IFileSaver extends Service{

  saveIfNotExists(
    relativePath: string,
    payload: Buffer | string,
    options?: SaveIfNotExistsOptions,
  ): Promise<IResultable<{path: string}, ["already-exists", "failed"]>>;

  exists(file: File):  Promise<Optionable<string>>;
}
