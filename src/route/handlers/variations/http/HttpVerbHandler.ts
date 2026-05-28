import type { IRouteHandler } from "@blazyts/backend-lib";
import type { URecord } from "@blazyts/better-standard-library";

import { fetch } from "bun";

import type { ClientBodyArgs, HttpVerbClientMetadata, HttpVerbHandlerCtx, HttpVerbHandlerMetadata, NormalRouteHandlerClientRepresentation } from "./types";
import { wrapResponseBodyInTypedRecord } from "./utils";

export class HttpVerbHandler<
  TCtx extends URecord,
  TReturn = unknown,
> implements IRouteHandler<
  HttpVerbHandlerCtx<TCtx>,
  any
> {
  constructor(
    public handleRequest: (arg: HttpVerbHandlerCtx<TCtx>) => TReturn,
    public metadata: HttpVerbHandlerMetadata,
  ) {

  }

  getClientRepresentation: NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (meta) => {
    const metadata: HttpVerbClientMetadata = {
      ...this.metadata,
      ...meta,
    };

    const clientFn = async (...args: ClientBodyArgs<TCtx>) => {
      const body = args[0];
      const method = metadata.verb?.toUpperCase() ?? metadata.protocol?.toUpperCase() ?? "GET";
      const canHaveBody = !["GET", "HEAD"].includes(method);

      const response = await (await fetch(metadata.serverUrl, {
        method,
        headers: canHaveBody ? { "content-type": "application/json" } : undefined,
        body: canHaveBody ? JSON.stringify(body ?? {}) : undefined,
      })).json() as TReturn;

      return wrapResponseBodyInTypedRecord(response);
    };

    Object.assign(clientFn, {
      method: metadata.verb?.toLowerCase(),
      path: metadata.path ?? this.metadata.subRoute,
      metadata,
    });

    return clientFn;
  };
}
