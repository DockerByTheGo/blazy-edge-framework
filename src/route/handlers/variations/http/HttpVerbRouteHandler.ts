import type { IRouteHandler } from "@blazyts/backend-lib";
import type { IRouteHandlerMetadata } from "@blazyts/backend-lib/src/core/server";
import type { URecord } from "@blazyts/better-standard-library";

import { fetch } from "bun";

import { HtmlResponse, JsonResponse, TextResponse } from "src/response";

type QueryValue = string | string[];
type QueryParams = Record<string, QueryValue>;

export type RestRequestCtx<TBody = unknown, TParams extends URecord = URecord, TQuery extends QueryParams = QueryParams> = {
  url: string;
  path: string;
  method: string;
  verb: string;
  headers: Record<string, string>;
  body: TBody;
  params: TParams;
  query: TQuery;
  whatwg: () => Request;
};

export type RestResponseCtx = {
  standard: (body?: unknown, init?: ResponseInit) => Response;
  json: (body: unknown, init?: ResponseInit) => Response;
  text: (body: string, init?: ResponseInit) => Response;
  html: (body: BodyInit, init?: ResponseInit) => Response;
};

type RawRequestData<TBody = unknown> = {
  url?: string;
  protocol?: string;
  verb?: string;
  headers?: Record<string, string>;
  body?: TBody;
};

export type HttpVerbHandlerCtx<
  TAppCtx extends URecord = URecord,
  TBody = unknown,
  TParams extends URecord = URecord,
  TQuery extends QueryParams = QueryParams,
> = {
  app?: TAppCtx;
  meta?: Request;
  request: RestRequestCtx<TBody, TParams, TQuery>;
  response: RestResponseCtx;
} & TAppCtx;

function parseQuery(url: string): QueryParams {
  const query: QueryParams = {};
  const searchParams = new URL(url, "http://blazy.local").searchParams;

  for (const [key, value] of searchParams.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    }
    else {
      query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    }
  }

  return query;
}

function getPath(url: string): string {
  return new URL(url, "http://blazy.local").pathname;
}

function createRestRequest(request: Omit<RestRequestCtx, "whatwg">): Request {
  const method = request.method.toUpperCase();
  const canHaveBody = !["GET", "HEAD"].includes(method);
  const url = new URL(request.url || "/", "http://blazy.local").toString();

  return new Request(url, {
    method,
    headers: request.headers,
    body: canHaveBody ? JSON.stringify(request.body ?? {}) : undefined,
  });
}

function createRestResponse(body: unknown, init?: ResponseInit): Response {
  if (body instanceof Response) {
    return body;
  }

  if (
    body === null
    || body === undefined
    || typeof body === "string"
    || body instanceof Blob
    || body instanceof ArrayBuffer
    || ArrayBuffer.isView(body)
    || body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof ReadableStream
  ) {
    return new Response(body as BodyInit | null | undefined, init);
  }

  return JsonResponse(body, init);
}

export function createHttpVerbHandlerCtx<TBody = unknown, TParams extends URecord = URecord>(
  rawCtx: unknown,
): HttpVerbHandlerCtx<URecord, TBody, TParams> {
  const raw = (rawCtx ?? {}) as URecord;
  const reqData = (raw.reqData ?? {}) as RawRequestData<TBody>;
  const params = ((raw.params ?? {}) as TParams);
  const body = (reqData?.body ?? raw.body ?? rawCtx ?? {}) as TBody;
  const method = String(reqData?.verb ?? reqData?.protocol ?? raw.protocol ?? raw.verb ?? "GET");
  const url = String(reqData?.url ?? raw.url ?? "");
  const query = parseQuery(url);
  const request = {
    url,
    path: getPath(url),
    method,
    verb: method,
    headers: (reqData?.headers ?? raw.headers ?? {}) as Record<string, string>,
    body,
    params,
    query,
  };
  const standardRequest = {
    ...request,
    whatwg: () => createRestRequest(request),
  };
  const response = {
    standard: createRestResponse,
    json: JsonResponse,
    text: TextResponse,
    html: HtmlResponse,
  };
  const routeParamKeys = new Set(Object.keys(params));
  const appCtx = Object.fromEntries(
    Object.entries(raw).filter(([key]) =>
      !routeParamKeys.has(key)
      && !["body", "params", "query", "reqData", "standard"].includes(key),
    ),
  );

  return {
    ...appCtx,
    request: standardRequest,
    response,
  } as HttpVerbHandlerCtx<URecord, TBody, TParams>;
}

export function getHttpValidationTarget(rawCtx: unknown): unknown {
  const raw = (rawCtx ?? {}) as URecord;
  if (raw.reqData && typeof raw.reqData === "object" && "body" in raw.reqData) {
    return (raw.reqData as { body: unknown }).body;
  }
  return rawCtx;
}

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
