import type { IRouteHandler } from "@blazyts/backend-lib/src/core/server/router/routeHandler";
import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { URecord } from "@blazyts/better-standard-library";
import fs from "node:fs";
import path from "node:path";
import { guessMimeType, resolveServerFilePath } from "./utils";


export type FileClientRepresentation = {
  type: "file";
  url: string;
  name: string;
  mimeType: string;
  download: () => Promise<Response>;
  stream: () => Promise<ReadableStream<Uint8Array> | null>;
  toArrayBuffer: () => Promise<ArrayBuffer>;
  toBlob: () => Promise<Blob>;
};

export class FileRouteHandler implements IRouteHandler<
  { body: URecord },
  URecord
> {
  public readonly metadata: { subRoute: string; method: "GET" };
  private readonly resolvedPath: string;
  private readonly mimeType: string;
  private readonly fileName: string;

  constructor(filePath: string, route: string) {
    this.resolvedPath = resolveServerFilePath(filePath);
    this.mimeType = guessMimeType(this.resolvedPath);
    this.fileName = path.basename(route);
    this.metadata = { subRoute: `/static${route}`, method: "GET" };
  }

  handleRequest(): URecord {
    try {
      const stats = fs.statSync(this.resolvedPath);
      if (!stats.isFile()) {
        return this.createNotFoundResponse();
      }

      const stream = fs.createReadStream(this.resolvedPath);
      return new Response(stream, {
        status: 200,
        headers: {
          "content-type": this.mimeType,
          "content-length": String(stats.size),
          "content-disposition": `inline; filename="${this.fileName}"`,
        },
      }) as unknown as URecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
        return this.createNotFoundResponse();
      }
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }) as unknown as URecord;
    }
  }

  getClientRepresentation = (metadata: IRouteHandlerMetadata): FileClientRepresentation => {
    const fetcher = async () => {
      const response = await fetch(metadata.serverUrl, { method: "GET" });
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      return response;
    };

    return {
      type: "file",
      url: metadata.serverUrl,
      name: this.fileName,
      mimeType: this.mimeType,
      download: () => fetcher(),
      stream: async () => (await fetcher()).body,
      toArrayBuffer: () => fetcher().then(res => res.arrayBuffer()),
      toBlob: () => fetcher().then(res => res.blob()),
    };
  };

  private createNotFoundResponse(): URecord {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    }) as unknown as URecord;
  }
}
