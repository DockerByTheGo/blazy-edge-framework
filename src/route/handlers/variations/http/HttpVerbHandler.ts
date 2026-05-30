import type { IRouteHandler } from "@blazyts/backend-lib";
import type { URecord } from "@blazyts/better-standard-library";

import { fetch } from "bun";


import type { ClientBodyArgs, HttpVerbClientMetadata, HttpVerbHandlerMetadata, NormalRouteHandlerClientRepresentation } from "./types";
import { wrapResponseBodyInTypedRecord } from "./utils";
import { JsonResponse } from "./responses";

type ExplicitStatusResponse = {
  status: number;
  body: unknown;
};

function isExplicitStatusResponse(value: unknown): value is ExplicitStatusResponse {
  return value !== null
    && typeof value === "object"
    && "status" in value
    && typeof (value as { status: unknown }).status === "number"
    && "body" in value;
}

async function readJsonResponse<TReturn>(response: Response): Promise<TReturn> {
  if (response.status === 204) {
    return null as TReturn;
  }

  const text = await response.text();
  if (text.length === 0) {
    return null as TReturn;
  }

  return JSON.parse(text) as TReturn;
}

export class HttpVerbHandler<
  TCtx = URecord,
  TReturn = unknown,
> implements IRouteHandler<
  any,
  any
> {
  constructor(
    private readonly handler: (arg: TCtx) => TReturn,
    public metadata: HttpVerbHandlerMetadata,
  ) {

  }

  public handleRequest(arg: TCtx): Response {
    try {
      const value = this.handler(arg);

      if (value instanceof Response) {
        return value;
      }

      if (value === null) {
        return new Response(null, { status: 204 });
      }

      if (value === undefined) {
        return JsonResponse(null, { status: 404 });
      }

      if (isExplicitStatusResponse(value)) {
        if (value.status === 204 || value.body === null || value.body === undefined) {
          return new Response(null, { status: value.status });
        }
        return JsonResponse(value.body, { status: value.status });
      }

      return JsonResponse(value, { status: 201 });
    }
    catch (error) {
      return JsonResponse({
        message: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
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

      const nativeResponse = await fetch(metadata.serverUrl, {
        method,
        headers: canHaveBody ? { "content-type": "application/json" } : undefined,
        body: canHaveBody ? JSON.stringify(body ?? {}) : undefined,
      });
      const response = await readJsonResponse<TReturn>(nativeResponse);

      return wrapResponseBodyInTypedRecord(response, nativeResponse);
    }) as ReturnType<NormalRouteHandlerClientRepresentation<TCtx, TReturn>>;

    Object.assign(clientFn, {
      method: metadata.verb?.toLowerCase(),
      path: metadata.path ?? this.metadata.subRoute,
      metadata,
    });

    return clientFn;
  };
}
