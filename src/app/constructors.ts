import { Hooks } from "@blazyts/backend-lib";

import { treeRouteFinder } from "src/route/finders";

import { Blazy } from "./core";

export class BlazyConstructor {
  static createEmpty(): Blazy<{}, {
  }> {
    return new Blazy({
      beforeHandler: Hooks.empty(),
      afterHandler: Hooks.empty(),
      onError: Hooks.empty(),
      onStartup: Hooks.empty(),
      onShutdown: Hooks.empty(),

    }, {} as any, treeRouteFinder);
    // .addService(CACHE_SERVICE_NAME, new CacheService())
    // .addService("logger", new LoggerService(new ConsoleLogSaver()))
    // .beforeRequestHandler("log", ctx => )
  }

  static createProd() {
    const app = BlazyConstructor
      .createEmpty();

    return app
      .beforeRequestHandler("attach", ctx => ({ ...ctx as { reqData: RequestData }, services: { ...app.services.services, mamanger: app.services } }));
  }
}
