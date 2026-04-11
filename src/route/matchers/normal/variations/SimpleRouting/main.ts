import { TypeMarker } from "@blazyts/better-standard-library";

import type { RouteMAtcher } from "../../../types";
import type { RouteBuilder } from "../../main";

export class Simple<
  T extends { name: string; paramType: "static" | "dynamic" }[],
> implements RouteMAtcher<{
  [Param in T[number]as Param["paramType"] extends "static" ? "" : Param["name"]]: Param["paramType"] extends "static" ? string : number;
}> {
  typeInfo = new TypeMarker("Simple");
  constructor(private context: T) {
  }

  getRouteString() {
    return this.context.map(param => param.paramType === "static" ? param.name : `:${param.name}`).join("/");
  }

  addDynamicParam<T extends string>(name: T): T extends RouteHandlerObject[number]["name"] ? never : RouteBuilder<[...RouteHandlerObject, { type: "static"; name: T }]> {

  }

  addStaticParam<T extends string>(name: T): T extends RouteHandlerObject[number]["name"] ? never : RouteBuilder<[...RouteHandlerObject, { type: "static"; name: T }]> {

  }

  static new(path: string) {
    return new Simple(
      path
        .split("/")
        .map(
          param => param.includes(":")
            ? { name: param.replace(":", ""), paramType: "dynamic" }
            : { name: param, paramType: "static" },
        ),
    );
  }

  static empty() {
    return new Simple([]);
  }
}
