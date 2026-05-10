import type { IRouteHandler } from "@blazyts/backend-lib";
import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { URecord } from "@blazyts/better-standard-library";

import { fetch } from "bun";

export type HttpVerbHandlerCtx<TAppCtx extends URecord> = {
  app: TAppCtx;
  meta: Request;
};

type NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (meta: IRouteHandlerMetadata) => (v: TCtx) => Promise<TReturn>;

export class HttpVerbHandler<
  TCtx extends URecord,
  TReturn = unknown,
> implements IRouteHandler<
  HttpVerbHandlerCtx<TCtx>,
  any
> {
  constructor(
    public handleRequest: (arg: HttpVerbHandlerCtx<TCtx>) => TReturn,
    public metadata: { subRoute: string; method: "POST" },
  ) {

  }

  getClientRepresentation: NormalRouteHandlerClientRepresentation<TCtx, TReturn> = (meta) => {
    const metadata: IRouteHandlerMetadata = {
      ...this.metadata,
      ...meta,
    };

    const clientFn = async (v: TCtx) => {
      return await (await fetch(metadata.serverUrl, {
        method: metadata.verb,
        body: JSON.stringify(v),
      })).json();
    };

    Object.assign(clientFn, {
      method: metadata.verb?.toLowerCase(),
      path: meta.path ?? this.metadata.subRoute,
      metadata,
    });

    return clientFn;
  };
}
