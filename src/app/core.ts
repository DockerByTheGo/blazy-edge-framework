import { RouterObject } from "@blazyts/backend-lib";
import type { PathStringToObject, RouterHooks, type RouteTree } from "@blazyts/backend-lib/src/core/server/router/types";
import { matchString, type And, type IFunc,  type TypeSafeOmit, type URecord,  } from "@blazyts/better-standard-library";
import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { Hook, Hooks, type HooksDefault } from "@blazyts/backend-lib/src/core/types/Hooks/Hooks";
import { treeRouteFinder } from "../route/finders";
import z from "zod/v4";
import { CleintBuilderConstructors, ClientBuilder } from "../client/client-builder/clientBuilder";
import type { IRouteHandler, RouteFinder } from "@blazyts/backend-lib/src/core/server";
import type { HandlerProtocol } from "../types";
import type { Service, ServiceBase } from "../services/main/Service";
import { NormalRouting } from "src/route/matchers/normal";
import { normalizeFileRoute } from "src/route/handlers/variations/file/utils";
import { FileRouteHandler } from "src/route/handlers/variations/file/File";
import { WebsocketRouteHandler } from "src/route/handlers/variations/websocket";
import { NormalRouteHandler } from "src/route/handlers";
import type { Schema } from "src/route/handlers/variations/websocket/types";
import { ServiceManager } from "src/services/main";
import type { ExtractParams } from "src/route/matchers/dsl/types/extractParams";
import { DSLRouting } from "src/route/matchers/dsl/main";
import { app } from "@test/e2e/server";
import { HtmlFileResponse, HtmlResponse, JsonResponse } from "src/response";
const FILE_SAVER_SERVICE_NAME = "fileSaver";
const CACHE_SERVICE_NAME = "cache";

type EmptyHooks = ReturnType<typeof Hooks.empty>
const subAppTypes = ["contained", "applyToParent", "global"] as const
type SubAppTypes = (typeof subAppTypes)[number]

export class Blazy<
  TRouterTree extends RouteTree,
  THooks extends RouterHooks,
  Tservices extends Record<string, Service<ServiceBase<URecord>>> = {}
> extends RouterObject<{
  beforeHandler: EmptyHooks,
  afterHandler: EmptyHooks,
  onError: EmptyHooks,
  onStartup: EmptyHooks,
  onShutdown: EmptyHooks

}, TRouterTree> {
  public services: ServiceManager;



  constructor(
    routerHooks: THooks,
    routes: TRouterTree,
    routeFinder: RouteFinder<any>
  ) {
    super(
      routerHooks
      ,
      routes ?? {},
      routeFinder ?? treeRouteFinder
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
    routeMatcher: { getRouteString(): TPath },
    handler: THandler,
    hooks?: TLocalHooks,
    protocol?: TProtocol
  }): Blazy<
    TRouterTree &
    PathStringToObject<
      TPath,
      THandler,
      TProtocol
    >,
    THooks
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
      handleRequest: arg => {
        try {
          return v.handler.handleRequest(arg);
        } catch (e) {
          if (v.hooks?.onError) {
            return v.hooks.onError(e);
          }
          throw e;
        }
      }
    };

    const protocol = v.protocol || 'http';
    current["/"][protocol] = modifiedHandler;

    return new Blazy(this.routerHooks, newRoutes, this.routeFinder,) as unknown as Blazy<
      TRouterTree &
      PathStringToObject<
        TPath,
        THandler,
        TProtocol
      >,
      THooks
    >;
  }

  /**
   * Adds a service to the Blazy instance, making it available through hooks.
   * Services are accessible in context as:
   * - ctx.services.serviceName (direct access to service)
   * - ctx.services (access to ServiceManager itself)
   * @param name - The name of the service.
   * @param v - The service object containing functions.
   */
  addService<TName extends string, TService extends ServiceBase<URecord>>(name: TName, v: TService) {
    this.services.addService({name, service: v});
    return this 
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
    TName extends string>(
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
            >
          ]>
        }
      ]>
    > {
    this.beforeHandler({ name, handler: func })
    return this
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

  rrws<
    THandler extends (arg: (TArgs extends undefined ? URecord : z.infer<TArgs>) & ExtractParams<TPath>) => unknown,
    TArgs extends z.ZodObject | undefined,
    TPath extends string,
  >(v: {
    handler: THandler,
    args: TArgs,
    path: TPath
  }) {
  }

  routifyRpc() { }

  // allows you to call multiple methods on the app while using the app object, this allosws for use cases where you may need to access the app object but do not wanna breake method chaining for example 
  /*
  
    const app = new Blazy().addRoute().addRoute().block(console.log)
  
    // without it you will have to break the method chaining to console log at this current point since yeah you could at thend but then it will also have applied methods which you do not wanna observer 
  */




  block<TReturn extends Blazy>(func: (app: this) => TReturn): TReturn {
    return func(this)
   }

  /**
   * Adds a simple route for a function with schema validation.
   * Creates an RPC-style route at `/rpc/{functionName}` that validates the request body
   * against the function's argument schema and executes the function.
   * the idea is that if you already have a function defined somewhere wjhich you want to quickly expose to use that, but if you are gonna be writing the func inside the router just use the http methoid which offers a much more elegant api for 
   * @param func - The function to add as a route.
   * @template TFunc - The type of the function.
   */
  // simpleAddRoute<TFunc extends IFunc<string, Schema, URecord>>(func: TFunc) {
  //   this.addRoute({
  //     routeMatcher: new NormalRouting(`/rpc/${func.name}`),
  //     handler: new NormalRouteHandler(ctx => {
  //       // return new BasicValidator(func.argsSchema).validate({}).try({
  //       //   ifError: {
  //       //     typeMismatch: v => new Response(JSON.stringify({ error: "Invalid schema", details: v }), {
  //       //       status: 400,
  //       //       headers: {
  //       //         "Content-Type": "application/json",
  //       //       },
  //       //     }),
  //       //   },
  //       //   "ifSuccess": v => new Response(JSON.stringify({ result: func.execute(v) }), {
  //       //     status: 200,
  //       //     headers: {
  //       //       "Content-Type": "application/json",
  //       //     },
  //       //   }),
  //       // })
  //     }),
  //     hooks: {}
  //   });
  // }


  // by default it uses the file name (or provided route) as the exposed route
  file<
    TPath extends string
  >(
    filePath: string,
    route?: TPath
  ): Blazy<
    TRouterTree & PathStringToObject<
      TPath,
      FileRouteHandler,
      "static"
    >,
    THooks
  > {
    const normalizedRoute = normalizeFileRoute(route ?? filePath);

    return this.addRoute({
      routeMatcher: new NormalRouting(normalizedRoute),
      handler: new FileRouteHandler(filePath, normalizedRoute),
    });
  }

  http<
    TPath extends string,
    Thandler extends (arg: Args extends null ? URecord : Args
    ) => unknown,
    TProtocol extends HandlerProtocol,
    Args extends z.ZodObject | null = null,
  >(v: {
    path: TPath,
    handler: Thandler,
    args?: Args,
    meta?: URecord & { protocol?: TProtocol },
    cache?: CacheHandlerConfig<
      Parameters<Thandler>[0] extends URecord ? Parameters<Thandler>[0] : URecord
    >
  }): Blazy<
    TRouterTree &
    PathStringToObject<
      TPath,
      NormalRouteHandler<
        Parameters<Thandler>[0],
        ReturnType<Thandler>
      >,
      TProtocol
    >,
    THooks
  > {
    const metadata = { subRoute: v.path, ...v.meta };
    const protocol = (v.meta?.protocol as TProtocol) || ('http' as TProtocol);
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
      } catch {
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
      if (v.args) {
        const res = v.args.safeParse(arg);
        if (!res.success) {
          return res.error;
        }
        return executeHandler(res.data as HandlerArg) as ReturnType<Thandler>;
      }
      return executeHandler(arg as HandlerArg) as ReturnType<Thandler>;
    };

    const finalHandler = new NormalRouteHandler(handlerFn, metadata);
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
    THandler extends (arg: (TArgs extends undefined ? URecord : z.infer<TArgs>) & ExtractParams<TPath>) => unknown,
    TArgs extends z.ZodObject | undefined,
    TPath extends string,
  >(config: {
    path: TPath,
    handeler: THandler,
    args?: TArgs,
    cache?: CacheHandlerConfig<Parameters<THandler>[0]>
  }): Blazy<
    TRouterTree &
    PathStringToObject<
      TPath,
      NormalRouteHandler<
        Parameters<THandler>[0],
        ReturnType<THandler>
      >,
      'POST'
    >,
    THooks
  > {
    // (this.services.services.cache as CacheService).registerHandler(`POST:${config.path}`, new NormalRouteHandler(config.handeler, { subRoute: config.path, verb: "POST", protocol: "POST" }))
    return this.http<TPath, THandler, any, 'POST'>({
      path: config.path,
      handler: v => config.handeler(v),
      meta: { verb: "POST", protocol: "POST" as const },
      cache: config.cache,
    })

  }

  getAll<
    THandler extends (arg: TArgs extends undefined ? URecord : TArgs) => unknown,
    TArgs extends URecord | undefined
  >(config: {
    args?: TArgs,
    handler: THandler
  }) {

    return this.get({
      path: "/",
      handler: config.handler,
      args: config.args
    })

  }

  get<
    TPath extends string,
    THandler extends (arg: (TArgs extends undefined ? URecord : TArgs) & ExtractParams<TPath> & THooks["beforeHandler"]["TGetLastHookReturnType"]) => unknown,
    TArgs extends URecord | undefined
  >(config: {
    path: TPath,
    handler: THandler,
    args: TArgs,
    cache?: CacheHandlerConfig<Parameters<THandler>[0]>
  }): Blazy<
    TRouterTree &
    PathStringToObject<
      TPath,
      NormalRouteHandler<
        Parameters<THandler>[0],
        ReturnType<THandler>
      >,
      'GET'
    >,
    THooks
  > {

    return this.http<TPath, THandler, any, 'GET'>({
      path: config.path,
      // handler: v => v.path === "GET" ? config.handler(v) : this.notFound(),
      handler: config.handler,
      args: config.args,
      meta: { verb: "GET", protocol: "GET" as const },
      cache: config.cache,
    })

  }

  html<TPath extends string>(config: {
    path: TPath,
    html: string,
    init?: ResponseInit,
  } | {
    path: TPath,
    filePath: string,
    init?: ResponseInit,
  }) {
    return this.get({
      path: config.path,
      handler: () => "html" in config
        ? HtmlResponse(config.html, config.init)
        : HtmlFileResponse(config.filePath, config.init),
      args: undefined,
    })
  }

  /**
   * Adds a route from a typed function.
   * @param name - The name of the route.
   * @param func - The typed function to add as a route.
   * @template TName - The name type.
   * @template TFunc - The function type.
   * @returns The result of adding the route.
   */
  fromFunc<
    TName extends string,
    TFunc extends IFunc<TName, any, any>,
  >(name: TName, func: TFunc): this {
    return this.rpcFromFunction(name, func);
  }

  /**
   * Adds a route from a normal function.
   * Converts the function to a typed function and adds it as a route.
   * Creats a REST endpoint
   * Automatically adds the result to the response body 
   * @param name - The name of the route.
   * @param func - The normal function to add as a route.
   * @template TFunc - The function type.
   * @template TName - The name type.
   * @returns The result of adding the route.
   *
   */
  fromNormalFunc<
    TFunc extends (arg: { body: URecord }) => unknown,
    TName extends string
  >(name: TName, func: TFunc) {
    return this.fromFunc(name, NormalFunc.fromFunc(func, name))
  }


  /*
    json rpc version of routify
  */
  rpcRoutify<T extends Record<string, IFunc<string, any, any>>>(funcs: T): this {
    return objectEntries(funcs).reduce(
      (app, [name, func]) => app.rpcFromFunction(name as string, func),
      this as this,
    );
  }

  rpc<
    TName extends string,
    THandlerReturn,
    TArgs extends z.ZodObject | undefined,
  >(v: {
    name: TName,
    handler: (arg: (TArgs extends undefined ? URecord : z.infer<TArgs>)) => THandlerReturn,
    args?: TArgs
  }) {
    return this.post({
      path: `/rpc/${v.name}`,
      handeler: v.handler,
      args: v.args,
      meta: { protocol: "POST", verb: "POST" },
    })
  }

  /*
  exposes a JSON RPC standard abiding the JSON rpc spec input and output, that is different from fromFunction which turns it into REST instead, it uses the custom Function construct from the better standard library which is designed to keep info 
  */
  rpcFromFunction<
    TFunc extends IFunc<string, any, any>,
  >( func: TFunc) {
    const subRoute = `/rpc/${func.name}`;
    return this.post({
      handeler: (ctx: { body?: Parameters<TFunc["execute"]>[0] }) => {
        const args = ctx.body ?? ({} as Parameters<TFunc["execute"]>[0]);
        return func.execute(args);
      },
      path: subRoute,
    }) as this;
  }



  ws<
    TPath extends string,
    TMessages extends Schema
  >(v: {
    path: TPath,
    messages: TMessages
  }): Blazy<
    TRouterTree &
    PathStringToObject<
      TPath,
      WebsocketRouteHandler<TMessages>,
      "ws"
    >,
    THooks
  > {
    return this.addRoute({
      routeMatcher: new NormalRouting(v.path),
      handler: new WebsocketRouteHandler(v.messages, { subRoute: v.path }),
      protocol: 'ws'
    });
  }

  wsFromObject() { }


  brpcRoutify() { }

  createClient(): ClientBuilder<TRouterTree, { beforeSend: HooksDefault, afterReceive: HooksDefault, onErrored: HooksDefault }> {
    return CleintBuilderConstructors.fromRouteTree(this.routes)
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
            try { body = await req.json(); } catch { body = {} }
          } else {
            try { const text = await req.text(); if (text) body = { text }; } catch { body = {} }
          }

          const res = this.route({ reqData: { url: req.url, protocol: req.method, body, verb: req.method, headers } });

          // If router returned a native Response, forward it. Otherwise try to coerce.
          if (res instanceof Response) return res;
          return JsonResponse(res);
        } catch (e) {
          console.log(e)
          return JsonResponse({ error: String(e) }, { status: 500 });
        }
      },

      websocket: {
        data: {} as WsMessage & { connectionId?: string },
        open: (ws) => {
          // Generate a unique connection ID
          const connectionId = crypto.randomUUID();
          ws.data.connectionId = connectionId;
          console.log("WebSocket connected:", connectionId, "pathname:", ws.data.pathname);
        },
        message: (ws, message) => {
          const parsedMessage = JSON.parse(message.toString()) as WsMessage;

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

          // Call the message handler directly from the schema
          const messageHandler = routeHandler.schema.messagesItCanRecieve[parsedMessage.type];
          if (messageHandler) {
            messageHandler.handler({ data: parsedMessage.body, ws });
          } else {
            console.error("No message handler for type:", parsedMessage.type);
          }
        },
        close: (ws) => {
          console.log("WebSocket closed:", ws.data.connectionId);
        },
      },
    });

    return server;
  }

  applySubApp<T extends BlazyDefault, TType extends SubAppTypes>(v: T, type : TType) {
    
    switch (type) {
      case "applyToParent": 
        break;
    case "contained":
        break;
      case "global":
        
        Object.entries(v.services.services).forEach(([name, value]) => 
          this.services.addService({name, service: value})
        )
        
        Object.entries(v.routerHooks).forEach(([hookBundleName, hooksBundle]) => 
          hooksBundle.v.forEach(hook => 
            this.routerHooks[hookBundleName as keyof RouterHooks].add(hook)
          )
      )
        break
    }
  }


  applySubAppInline<Treturn extends Blazy>(func: (subRouter: this) => Treturn): this { } // so that we preserve intellisense 

  createSubrouter(): this { // so that we preserve intellisnse however note that you can define a subrouter in different file that way because it will create circular dependnecy 

  }

}

export type BlazyDefault = Blazy<RouteTree, RouterHooks>
