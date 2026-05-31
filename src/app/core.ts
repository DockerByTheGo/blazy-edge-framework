import type { IRouteHandler, RouteFinder } from "@blazyts/backend-lib/src/core/server";
import type { PathStringToObject, RouterHooks, RouteTree } from "@blazyts/backend-lib/src/core/server/router/types";
import type { Hook, HooksDefault } from "@blazyts/backend-lib";
import type { And, TypeSafeOmit, URecord } from "@blazyts/better-standard-library";
import type z from "zod/v4";

import { Hooks, RouterObject } from "@blazyts/backend-lib";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { entries } from "@blazyts/better-standard-library";

import type { HttpVerbHandlerCtx } from "../route/handlers";
import type { Schema, WebSocketMessage } from "../route/handlers/variations/websocket/types";
import type { ExtractParams } from "../route/matchers/dsl/types/extractParams";

import { HttpVerbHandler } from "../route/handlers";
import { FileRouteHandler } from "../route/handlers/variations/file/File";
import { normalizeFileRoute } from "../route/handlers/variations/file/utils";
import { createHttpVerbHandlerCtx, getHttpValidationTarget, TypedRecord } from "../route/handlers/variations/http/HttpVerbRouteHandler";
import { WebsocketRouteHandler } from "../route/handlers/variations/websocket";
import { DSLRouting } from "../route/matchers/dsl/main";
import { NormalRouting } from "../route/matchers/normal";
import { ServiceManager } from "../services/main";

import type { ClientBuilder } from "../client/client-builder/clientBuilder";
import type { ServiceBase } from "../services/main/Service";
import type { HandlerProtocol } from "../types";

import { CleintBuilderConstructors } from "../client/client-builder/clientBuilder";
import { treeRouteFinder } from "../route/finders";
import type { ZodObject } from "zod/v4";
import { FailedValidationResponse, HtmlFileResponse, HtmlResponse, JsonResponse } from "../route/handlers/variations/http/responses";

const FILE_SAVER_SERVICE_NAME = "fileSaver";
const CACHE_SERVICE_NAME = "cache";

type Handler<TArg> = (arg: TArg) => unknown;
type EmptyHooks = ReturnType<typeof Hooks.empty>;
type AwaitedBeforeHandlerCtx<THooks extends RouterHooks> = Awaited<THooks["beforeHandler"]["TGetLastHookReturnType"]>;
type BlazyHandlerCtx<
  TServices extends Record<string, ServiceBase<URecord>>,
  THooks extends RouterHooks,
> = Omit<AwaitedBeforeHandlerCtx<THooks>, "reqData" | "services">
  & { services: ServiceManager<TServices> };
const subAppTypes = ["contained", "applyToParent", "global"] as const;
type SubAppTypes = (typeof subAppTypes)[number];
type BlazyRequestData = {
  url: string;
  protocol?: string;
  verb?: string;
  headers: Record<string, string>;
  body: unknown;
};

type NotFoundReason = "route" | "method";
type NotFoundContext = {
  request: {
    url: string;
    path: string;
    method: string;
    verb: string;
    headers: Record<string, string>;
    body: unknown;
  };
  reason: NotFoundReason;
  availableProtocols: string[];
};
type NotFoundHandler = (ctx: NotFoundContext) => unknown;

function defaultNotFoundHandler(ctx: NotFoundContext): Response {
  const routeMessage = ctx.reason === "route"
    ? `No route found for ${ctx.request.method} ${ctx.request.path}`
    : `No ${ctx.request.method} handler found for ${ctx.request.path}`;

  return JsonResponse({
    type: "not_found",
    body: {
      message: routeMessage,
      reason: ctx.reason,
      method: ctx.request.method,
      path: ctx.request.path,
      availableProtocols: ctx.availableProtocols,
    },
  }, { status: 404 });
}

function createNotFoundContext(requestData: BlazyRequestData, reason: NotFoundReason, availableProtocols: string[] = []): NotFoundContext {
  const method = String(requestData.verb ?? requestData.protocol ?? "GET");
  const url = new URL(requestData.url || "/", "http://blazy.local");

  return {
    request: {
      url: requestData.url,
      path: url.pathname,
      method,
      verb: method,
      headers: requestData.headers ?? {},
      body: requestData.body ?? {},
    },
    reason,
    availableProtocols,
  };
}

export class Blazy<
  TRouterTree extends RouteTree,
  THooks extends RouterHooks,
  Tservices extends Record<string, ServiceBase<URecord>> = {},
  TDCtx extends URecord = BlazyHandlerCtx<Tservices, THooks>,
> extends RouterObject<{
  beforeHandler: EmptyHooks;
  afterHandler: EmptyHooks;
  onError: EmptyHooks;
  onStartup: EmptyHooks;
  onShutdown: EmptyHooks;

}, TRouterTree> {
  public services: ServiceManager<Tservices>;

  constructor(
    routerHooks: THooks,
    routes: TRouterTree,
    routeFinder: RouteFinder<any>,
    private routeNotFoundHandler: NotFoundHandler = defaultNotFoundHandler,
  ) {
    super(
      routerHooks,
      routes ?? {},
      routeFinder ?? treeRouteFinder,
    );
    this.services = new ServiceManager();
  }

  /**
   * Override addRoute to return a Blazy instance instead of RouterObject
   * and to structure routes with "/" prefix for tree-based routing
   */
  override addRoute<
    TPath extends string,
    THandler extends IRouteHandler<any, any>,
    TProtocol extends HandlerProtocol,
    TLocalHooks extends Record<string, any> | undefined = undefined,
  >(v: {
    routeMatcher: { getRouteString: () => TPath };
    handler: THandler;
    hooks?: TLocalHooks;
    protocol?: TProtocol;
  },
  ): Blazy<
    TRouterTree
    & PathStringToObject<
      TPath,
      THandler,
      TProtocol
    >,
    THooks,
    Tservices
  > {
    const routeString = v.routeMatcher.getRouteString();
    const segments = routeString.split("/").filter(s => s !== "");
    const newRoutes = { ...this.routes };
    let current: any = newRoutes;

    // Navigate/create nested structure
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!current[segment]) {
        current[segment] = {};
      }
      current = current[segment];
    }

    // Initialize "/" object if it doesn't exist
    if (!current["/"]) {
      current["/"] = {};
    }

    // Place handler at protocol key under "/"
    const modifiedHandler: any = {
      ...v.handler,
      getClientRepresentation: v.handler.getClientRepresentation,
      handleRequest: (arg) => {
        try {
          return v.handler.handleRequest(arg);
        }
        catch (e) {
          if (v.hooks?.onError) {
            return v.hooks.onError(e);
          }
          throw e;
        }
      },
    };

    const protocol = v.protocol || "http";
    current["/"][protocol] = modifiedHandler;

    return new Blazy(this.routerHooks, newRoutes, this.routeFinder, this.routeNotFoundHandler) as unknown as Blazy<
      TRouterTree
      & PathStringToObject<
        TPath,
        THandler,
        TProtocol
      >,
      THooks,
      Tservices
    >;
  }

  onNotFound(handler: NotFoundHandler): this {
    this.routeNotFoundHandler = handler;
    return this;
  }

  override async route(request: { reqData: BlazyRequestData }) {
    if (!request.reqData.protocol) {
      request.reqData.protocol = "GET";
    }
    if (!request.reqData.verb) {
      request.reqData.verb = request.reqData.protocol;
    }

    try {
      const req = await this.routerHooks.beforeHandler.execute(request) as { reqData: BlazyRequestData };
      const routeOptional = this.routeFinder(this.routes, new Path(req.reqData.url));

      if (routeOptional.isNone()) {
        return this.routeNotFoundHandler(createNotFoundContext(req.reqData, "route"));
      }

      const routeHandlers = routeOptional.unpack();
      const handlers = routeHandlers.valueOf();
      const protocol = req.reqData.protocol ?? "GET";
      const handler = handlers[protocol];

      if (!handler) {
        return this.routeNotFoundHandler(
          createNotFoundContext(req.reqData, "method", Object.keys(handlers)),
        );
      }

      const response = await handler.handleRequest(req);
      return await this.routerHooks.afterHandler.execute(response);
    }
    catch (e) {
      return await this.routerHooks.onError.execute(e);
    }
  }

  /**
   * Adds a service to the Blazy instance, making it available through hooks.
   * Services are accessible in handler context through ctx.services.
   * @param name - The name of the service.
   * @param v - The service object containing functions.
   */
  addService<
    TName extends string,
    TService extends ServiceBase<URecord>
  >(
    name: TName,
    v: TService
  ): Blazy<
    TRouterTree,
    THooks,
    Tservices & { [key in TName]: TService }
  > {
    this.services.addService({ name, service: v });
    return this as unknown as Blazy<TRouterTree, THooks, Tservices & { [key in TName]: TService }>;
  }

  /**
   * Sets up pre-authentication logic.
   * This method configures hooks that run before authentication.
   */
  beforeAuth<TName extends string>(
    name: TName,
    handler: (req: THooks["beforeHandler"]["TGetLastHookReturnType"]) => THooks["beforeHandler"]["TGetLastHookReturnType"],
  ): this {
    this.beforeHandler({
      name,
      handler: handler as any,
    });
    return this;
  }

  beforeRequestHandler<
    TReturn,
    TName extends string,
  >(
    name: TName,
    func: (arg: THooks["beforeHandler"]["TGetLastHookReturnType"]) => TReturn,

  ): Blazy<
    TRouterTree,
    And<[
      TypeSafeOmit<THooks, "beforeHandler">,
      {
        beforeHandler: Hooks<[
          ...THooks["beforeHandler"]["v"],
          Hook<
            TName,
            (arg: THooks["beforeHandler"]["TGetLastHookReturnType"]) => TReturn
          >,
        ]>;
      },
    ]>,
    Tservices
  > {
    this.beforeHandler({ name, handler: func as any });
    return this as unknown as Blazy<
      TRouterTree,
      And<[
        TypeSafeOmit<THooks, "beforeHandler">,
        {
          beforeHandler: Hooks<[
            ...THooks["beforeHandler"]["v"],
            Hook<
              TName,
              (arg: THooks["beforeHandler"]["TGetLastHookReturnType"]) => TReturn
            >,
          ]>;
        },
      ]>,
      Tservices
    >;
  }

  /**
   * Handles logic after a request handler has been executed but before sending the response.
   * @param ctx - The request context.
   */
  afterRequestHandler(ctx) {
    if (ctx.isResponse) {
      // if a handler returned a response directly these will be skipped
    }
  } // runs after a req hanfdler has been ran but before sending the Response

  /**
   * Handles logic after the response has been sent.
   * This method configures hooks that run on sent responses.
   */
  afterResponse() {

  } // runs on a sent response

  /**
   * Converts an object with functions into routes.
   * If the object has an `isCrudified` property, it treats it as CRUD operations.
   * Otherwise, it adds each function as a POST route.
   * @param v - The object containing functions to be routed.
   * @template T - The type of the object.
   */
  routify<T extends Record<string, unknown>>(v: T) {
    if (v.isCrudified) {
      Object.entries(v).filter(([key, val]) => typeof val === "function").forEach(([key, value]) => {
        this[key](key, value);
      });
    }
    else {
      entries(v).filter(([key, val]) => typeof val === "function").forEach(([key, value]) => {
        this.post(key, value);
      });
    }
  }

  // allows you to call multiple methods on the app while using the app object, this allosws for use cases where you may need to access the app object but do not wanna breake method chaining for example
  /*

    const app = new Blazy().addRoute().addRoute().block(console.log)

    // without it you will have to break the method chaining to console log at this current point since yeah you could at thend but then it will also have applied methods which you do not wanna observer
  */
  block<TReturn extends Blazy<any, any, any, any>>(func: (app: this) => TReturn): TReturn {
    return func(this);
  }

  // by default it uses the file name (or provided route) as the exposed route
  file<
    TPath extends string,
  >(
    filePath: string,
    route?: TPath,
  ): Blazy<
    TRouterTree & PathStringToObject<
      TPath,
      FileRouteHandler,
      "static"
    >,
    THooks,
    Tservices
  > {
    const normalizedRoute = normalizeFileRoute(route ?? filePath);
    const clientRoute = normalizedRoute.replace(/^\/static(?=\/|$)/, "") || "/";

    return this.addRoute({
      routeMatcher: new NormalRouting(clientRoute),
      handler: new FileRouteHandler(filePath, clientRoute),
      protocol: "static",
    });
  }

  http<
    TPath extends string,
    Thandler extends (arg: any) => unknown,
    TProtocol extends HandlerProtocol,
    Args extends z.ZodObject | null = null,
  >(v: {
    path: TPath;
    handler: Thandler;
    args?: Args;
    meta?: URecord & { protocol?: TProtocol };
    cache?: any;
  },
  ): Blazy<
    TRouterTree
    & PathStringToObject<
      TPath,
      HttpVerbHandler<
        Parameters<Thandler>[0],
        ReturnType<Thandler>
      >,
      TProtocol
    >,
    THooks,
    Tservices
  > {
    const metadata = { subRoute: v.path, ...v.meta };
    const protocol = (v.meta?.protocol as TProtocol) || ("http" as TProtocol);
    const cacheService = this.services.getService<CacheService>(CACHE_SERVICE_NAME);
    type HandlerArg = Parameters<Thandler>[0] extends URecord ? Parameters<Thandler>[0] : URecord;
    const cacheConfig = v.cache;
    const handlerId = `${protocol}:${metadata.subRoute}`;
    const shouldUseCache = Boolean(cacheService && cacheConfig && protocol !== "ws");
    const buildCacheKey = (value: HandlerArg) => {
      if (cacheConfig?.key) {
        return cacheConfig.key(value);
      }

      try {
        return JSON.stringify(value);
      }
      catch {
        return String(value);
      }
    };

    const executeHandler = (value: HandlerArg) => {
      if (!shouldUseCache || !cacheService || !cacheConfig) {
        return v.handler(value);
      }

      const key = buildCacheKey(value);
      if (cacheService.hasEntry(handlerId, key)) {
        return cacheService.getEntry(handlerId, key) as ReturnType<Thandler>;
      }

      const result = v.handler(value);
      cacheService.setEntry(handlerId, key, result, cacheConfig.ttl);
      return result;
    };

    const handlerFn = (arg: Parameters<Thandler>[0]) => {
      const ctx = createHttpVerbHandlerCtx(arg);
      if (v.args) {
        const res = v.args.safeParse(getHttpValidationTarget(arg));
        if (!res.success) {
          return FailedValidationResponse(res.error);
        }
        return executeHandler({
          ...ctx,
          request: {
            ...ctx.request,
            body: new TypedRecord(res.data),
          },
        } as HandlerArg) as ReturnType<Thandler>;
      }
      return executeHandler(ctx as HandlerArg) as ReturnType<Thandler>;
    };

    const finalHandler = new HttpVerbHandler(handlerFn, metadata);
    if (shouldUseCache && cacheService) {
      cacheService.registerHandler(handlerId, finalHandler);
    }

    return this.addRoute({
      routeMatcher: new DSLRouting(v.path),
      protocol,
      handler: finalHandler,
    });
  }

  // note if you try to introduce optional param it will lead to weird behaviour where it  creates two paths for one added handler one which is [''] and the other is the desried
  post<
    TPath extends string,
    TArgs extends z.ZodObject | undefined = undefined,
    TContext extends HttpVerbHandlerCtx<
      TDCtx,
      TArgs extends undefined ? URecord : z.infer<NonNullable<TArgs>>,
      ExtractParams<TPath>
    > = HttpVerbHandlerCtx<
      TDCtx,
      TArgs extends undefined ? URecord : z.infer<NonNullable<TArgs>>,
      ExtractParams<TPath>
    >,
    THandler extends (ctx: TContext) => any = (ctx: TContext) => any,
  >(config: {
    path: TPath;
    handler: THandler;
    args?: TArgs;
    cache?: any;
  },
  ): Blazy<
    TRouterTree
    & PathStringToObject<
      TPath,
      HttpVerbHandler<
        TContext,
        ReturnType<THandler>
      >,
      "POST"
    >,
    THooks,
    Tservices
  > {
    // (this.services.services.cache as CacheService).registerHandler(`POST:${config.path}`, new NormalRouteHandler(config.handeler, { subRoute: config.path, verb: "POST", protocol: "POST" }))
    return this.http<TPath, THandler, "POST", TArgs extends undefined ? null : NonNullable<TArgs>>({
      path: config.path,
      handler: v => config.handler(v),
      args: config.args,
      meta: { verb: "POST", protocol: "POST" as const },
      cache: config.cache,
    });
  }

  getAll<
    TArgs extends z.ZodObject | undefined = undefined,
    THandler extends Handler<
      HttpVerbHandlerCtx<
        TDCtx,
        TArgs extends undefined ? URecord : z.infer<NonNullable<TArgs>>,
        {}
      >
    > = Handler<
      HttpVerbHandlerCtx<
        TDCtx,
        TArgs extends undefined ? URecord : z.infer<NonNullable<TArgs>>,
        {}
      >
    >,
  >(config: {
    handler: THandler;
    args?: TArgs;
  },
  ) {
    return this.get({
      path: "/",
      handler: config.handler,
    });
  }

  // if status isnt mentioned explicitely it is granted that its 201, if its null its 404, if undefined its 204, if an error is thrown it returns 500 and logs error intearnally 
  get<
    TPath extends string,
    TContext extends HttpVerbHandlerCtx<
      TDCtx,
      {},
      ExtractParams<TPath>
    > = HttpVerbHandlerCtx<
      TDCtx,
      {},
      ExtractParams<TPath>
    >,
    THandler extends (ctx: TContext) => any = (ctx: TContext) => { status: number, body: unknown } | URecord | null | undefined,
  >(config: {
    path: TPath;
    handler: THandler;
    cache?: any;
  },
  ): Blazy<
    TRouterTree
    & PathStringToObject<
      TPath,
      HttpVerbHandler<
        TContext,
        ReturnType<THandler>
      >,
      "GET"
    >,
    THooks,
    Tservices
  > {
    return this.http<TPath, THandler, "GET">({
      path: config.path,
      handler: config.handler,
      meta: { verb: "GET", protocol: "GET" as const },
      cache: config.cache,
    });
  }

  html<TPath extends string>(config: {
    path: TPath;
    html: string;
    init?: ResponseInit;
  } | {
    path: TPath;
    filePath: string;
    init?: ResponseInit;
  }) {
    return this.get({
      path: config.path,
      handler: () => "html" in config
        ? HtmlResponse(config.html, config.init)
        : HtmlFileResponse(config.filePath, config.init),
    });
  }

  rpc<
    TName extends string,
    THandlerReturn,
    TArgs extends z.ZodObject | undefined,
  >(v: {
    name: TName;
    handler: (
      arg: HttpVerbHandlerCtx<{}, TArgs extends undefined ? {} : z.infer<TArgs>, {}, {}>
    )
      => THandlerReturn;
    args?: TArgs;
  },
  ) {
    return this.post({
      path: `/rpc/${v.name}`,
      handler: v.handler,
      args: v.args,
    });
  }

  /*
  exposes a JSON RPC standard abiding the JSON rpc spec input and output, that is different from fromFunction which turns it into REST instead, it uses the custom Function construct from the better standard library which is designed to keep info
  */

  ws<
    TPath extends string,
    TMessages extends Schema<{ params: ExtractParams<TPath> }>,
  >(v: {
    path: TPath;
    messages: TMessages;
  },
  ): Blazy<
    TRouterTree
    & PathStringToObject<
      TPath,
      WebsocketRouteHandler<TMessages>,
      "ws"
    >,
    THooks,
    Tservices
  > {
    const routeMatcher = new DSLRouting(v.path);

    return this.addRoute({
      routeMatcher,
      handler: new WebsocketRouteHandler(v.messages, {
        subRoute: routeMatcher.getRouteString(),
        protocol: "ws",
      }),
      protocol: "ws",
    });
  }

  createClient(): ClientBuilder<TRouterTree, { beforeSend: HooksDefault; afterReceive: HooksDefault; onErrored: HooksDefault }> {
    return CleintBuilderConstructors.fromRouteTree(this.routes);
  }

  listen(port: number = 3000) {
    const server = Bun.serve({
      port,
      fetch: async (req: Request) => {
        try {
          const url = new URL(req.url);
          const pathname = url.pathname;

          // Check if this is a WebSocket upgrade request
          const upgradeHeader = req.headers.get("upgrade");

          if (upgradeHeader?.toLowerCase() === "websocket") {
            const success = server.upgrade(req, { data: { pathname, body: {}, type: "join" } });
            console.log("Upgrade success:", success);
            if (success) {
              return undefined;
            }
          }

          const headers: Record<string, string> = {};
          req.headers.forEach((v, k) => (headers[k] = v));

          let body: any = {};
          const contentType = req.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            try { body = await req.json(); }
            catch { body = {}; }
          }
          else {
            try {
              const text = await req.text(); if (text)
                body = { text };
            }
            catch { body = {}; }
          }

          const res = await this.route({ reqData: { url: req.url, protocol: req.method, body, verb: req.method, headers } });

          // If router returned a native Response, forward it. Otherwise try to coerce.
          if (res instanceof Response)
            return res;
          return JsonResponse(res);
        }
        catch (e) {
          console.log(e);
          return JsonResponse({ error: String(e) }, { status: 500 });
        }
      },

      websocket: {
        data: {} as WebSocketMessage & { connectionId?: string; pathname?: string },
        open: (ws) => {
          // Generate a unique connection ID
          const connectionId = crypto.randomUUID();
          ws.data.connectionId = connectionId;
          console.log("WebSocket connected:", connectionId, "pathname:", ws.data.pathname);
        },
        message: (ws, message) => {
          const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;

          // Find the handler for this route
          const handlerOptional = treeRouteFinder(this.routes, new Path(ws.data.pathname));

          if (handlerOptional.isNone()) {
            console.error("No handler found for path:", ws.data.pathname);
            return;
          }

          const routeHandlers = handlerOptional.unpack();

          // Get the ws handler from the protocol-organized structure
          const routeHandler = routeHandlers.valueOf().ws;

          if (!routeHandler) {
            console.error("No ws handler found for path:", ws.data.pathname);
            console.log("Available protocols:", Object.keys(routeHandlers));
            return;
          }

          routeHandler.handleRequest({
            ...parsedMessage,
            path: parsedMessage.path ?? ws.data.pathname,
            ws,
          });
        },
        close: (ws) => {
          console.log("WebSocket closed:", ws.data.connectionId);
        },
      },
    });

    return server;
  }

  applySubApp<T extends BlazyDefault, TType extends SubAppTypes>(v: T, type: TType) {
    switch (type) {
      case "applyToParent":
        break;
      case "contained":
        break;
      case "global":

        Object.entries(v.services.services).forEach(([name, value]) =>
          this.services.addService({ name, service: value }),
        );

        Object.entries(v.routerHooks).forEach(([hookBundleName, hooksBundle]) =>
          hooksBundle.v.forEach(hook =>
            this.routerHooks[hookBundleName as keyof RouterHooks].add(hook),
          ),
        );
        break;
    }
  }

  applySubAppInline<Treturn extends Blazy>(func: (subRouter: this) => Treturn): this { } // so that we preserve intellisense

  createSubrouter(): this { // so that we preserve intellisnse however note that you can define a subrouter in different file that way because it will create circular dependnecy

  }
}

export type BlazyDefault = Blazy<RouteTree, RouterHooks>;
