import type { URecord } from "@blazyts/better-standard-library";

import { TypedRecord } from "@blazyts/better-standard-library";

import { HtmlResponse, JsonResponse, TextResponse } from "src/response";

import type { HttpVerbClientResponse, HttpVerbHandlerCtx, QueryParams, RestRequestCtx, TypedRecordShape, TypedResponseBody } from "../types";
import type { RawRequestData } from "./types";

type ResponseBody = ConstructorParameters<typeof Response>[0];

export function parseQuery(url: string): QueryParams {
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

export function getPath(url: string): string {
  return new URL(url, "http://blazy.local").pathname;
}

export function createRestRequest(request: Omit<RestRequestCtx, "whatwg">): Request {
  const method = request.method.toUpperCase();
  const canHaveBody = !["GET", "HEAD"].includes(method);
  const url = new URL(request.url || "/", "http://blazy.local").toString();

  return new Request(url, {
    method,
    headers: request.headers.raw(),
    body: canHaveBody ? JSON.stringify(request.body ?? {}) : undefined,
  });
}

export function createRestResponse(body: unknown, init?: ResponseInit): Response {
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
    return new Response(body as ResponseBody, init);
  }

  return JsonResponse(body, init);
}

export function createHttpVerbHandlerCtx<TBody = unknown, TParams extends object = URecord>(
  rawCtx: unknown,
): HttpVerbHandlerCtx<URecord, TBody, TParams> {
  const raw = (rawCtx ?? {}) as URecord;
  const reqData = (raw.reqData ?? {}) as RawRequestData<TBody>;
  const params = (raw.params ?? {}) as TypedRecordShape<TParams>;
  const body = (reqData?.body ?? raw.body ?? rawCtx ?? {}) as TypedRecordShape<TBody>;
  const method = String(reqData?.verb ?? reqData?.protocol ?? raw.protocol ?? raw.verb ?? "GET");
  const url = String(reqData?.url ?? raw.url ?? "");
  const query = parseQuery(url);
  const headers = (reqData?.headers ?? raw.headers ?? {}) as Record<string, string>;
  const request = {
    url,
    path: getPath(url),
    method,
    verb: method,
    headers: new TypedRecord(headers),
    body: new TypedRecord(body),
    params: new TypedRecord(params),
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

function attachWhatwgResponse<TValue>(value: TValue, response?: Response): TValue {
  if (
    response
    && value !== null
    && (typeof value === "object" || typeof value === "function")
  ) {
    Object.defineProperty(value, "whatwg", {
      configurable: true,
      enumerable: false,
      value: () => response,
    });
  }

  return value;
}

export function wrapResponseBodyInTypedRecord<TReturn>(
  value: TReturn,
  response?: Response,
): HttpVerbClientResponse<TReturn> {
  let nextValue: TypedResponseBody<TReturn>;

  if (
    value !== null
    && typeof value === "object"
    && "body" in value
    && (value as { body: unknown }).body !== null
    && typeof (value as { body: unknown }).body === "object"
    && !((value as { body: unknown }).body instanceof TypedRecord)
  ) {
    nextValue = {
      ...value,
      body: new TypedRecord((value as { body: URecord }).body),
    } as TypedResponseBody<TReturn>;
  }
  else {
    nextValue = value as TypedResponseBody<TReturn>;
  }

  return attachWhatwgResponse(nextValue, response) as HttpVerbClientResponse<TReturn>;
}
