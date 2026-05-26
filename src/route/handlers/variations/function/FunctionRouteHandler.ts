import type { IRouteHandler } from "@blazyts/backend-lib/src/core/server/router/routeHandler";
import type { IFunc, URecord } from "@blazyts/better-standard-library";
import type { ZodObject } from "zod/v4";

export class FunctionRouteHandler<
  TFunc extends IFunc<string, ZodObject, URecord>,

> implements IRouteHandler<
  { body: TFunc["TGetArgs"] },
  { body: TFunc["TGetReturnType"] }
> {
  public readonly metadata: { subRoute: string };

  constructor(public readonly func: TFunc, subRoute?: string) {
    this.metadata = {
      subRoute: subRoute ?? `/rpc/${this.func.name}`,
    };
  }

  handleRequest: (arg: { body: TFunc["TGetArgs"] }) => { body: TFunc["TGetReturnType"] } = (arg) => {
    this.func.argsSchema.parse(arg.body);

    return this.func.execute(arg.body);
  };

  getClientRepresentation = (metadata: { subRoute: string }) => ({
    method: "post",
    path: metadata.subRoute,
  });
}
