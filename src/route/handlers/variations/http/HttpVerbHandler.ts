import type { IRouteHandler } from "@blazyts/backend-lib";
import type { URecord } from "@blazyts/better-standard-library";

import { fetch } from "bun";

import type { ClientBodyArgs, HttpVerbClientMetadata, HttpVerbHandlerMetadata, NormalRouteHandlerClientRepresentation } from "./types";
import { wrapResponseBodyInTypedRecord } from "./utils";

export class HttpVerbHandler<
  TCtx = URecord,
  TReturn = unknown,
> implements IRouteHandler<
  any,
  any
> {
  constructor(
    public handleRequest: (arg: TCtx) => TReturn,
    public metadata: HttpVerbHandlerMetadata,
  ) {

  }

  getClientRepresentation: NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (meta) => {
    const metadata: HttpVerbClientMetadata = {
      ...this.metadata,
      ...meta,
    };

    const clientFn = (async (...args: ClientBodyArgs<TCtx>) => {
      const body = args[0];
      const method = metadata.verb?.toUpperCase() ?? metadata.protocol?.toUpperCase() ?? "GET";
      const canHaveBody = !["GET", "HEAD"].includes(method);

      const response = await (await fetch(metadata.serverUrl, {
        method,
        headers: canHaveBody ? { "content-type": "application/json" } : undefined,
        body: canHaveBody ? JSON.stringify(body ?? {}) : undefined,
      })).json() as TReturn;

      return wrapResponseBodyInTypedRecord(response);
    }) as ReturnType<NormalRouteHandlerClientRepresentation<TCtx, TReturn>>;

    Object.assign(clientFn, {
      method: metadata.verb?.toLowerCase(),
      path: metadata.path ?? this.metadata.subRoute,
      metadata,
    });

    return clientFn;
  };
}
