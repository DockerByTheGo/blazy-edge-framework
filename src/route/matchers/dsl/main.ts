import { TypeMarker } from "@blazyts/better-standard-library";

import { panic, panicTypeOnlyVariable } from "@blazyts/better-standard-library";
import { Optionable } from "@blazyts/better-standard-library/src/data_structures/functional-patterns/option/main";

import { extractParams, type ExtractParams } from "./types/extractParams";

import { getParts, type RouteMAtcher } from "@blazyts/backend-lib";

const IsDynamic = (s: string) => s[0] === ":";

function match<T extends string>(schema: T, config: { [K in T]: (v: K) => void }) {
  return config[schema](schema);
}


const types = [{ date: "(" }, { number: "$" }];
export type paramTypes = typeof types;


function getParamType(s: string): Optionable<keyof paramTypes[number]> {

const symbols = ["(", "$"] as const;
const names = ["date", "number"] as const;
  if (symbols.includes(s as any))
  return symbols.includes(s)
    ? Optionable.some(names[symbols.indexOf(s)])
    : Optionable.none();
}

export class DSLRouting<TRoute extends string> implements RouteMAtcher<ExtractParams<TRoute>> {
  constructor(public readonly matcher: TRoute) {

  }

  TGetRouteString: string = () => panicTypeOnlyVariable("")
  getRouteString() { return this.matcher.replaceAll("$", "").replaceAll("^", "") }
  get TGetContextType(): ExtractParams<TRoute> { return panicTypeOnlyVariable() as any }

  typeInfo: TypeMarker<string> = new TypeMarker("");

  match(path: string): Optionable<ExtractParams<TRoute>> {
    const matcherParts = getParts(this.matcher);
    const pathParts = getParts(path);

    const g: typeof this.TGetContextType = {};
    for (let i = 0; i < matcherParts.length; i++) {
      const currentMatcherPart = matcherParts[i];
      const currentRoutePart = pathParts[i];

      if (IsDynamic(currentMatcherPart)) {
        const paramName = currentMatcherPart.slice(1, currentMatcherPart.length - 1);
        const ParamType = getParamType(currentMatcherPart[currentMatcherPart.length - 1]);

        ParamType
        .try({
          ifNone: () => {
            g[paramName] = currentRoutePart as string;
            return false;
          },
          ifNotNone: (v) => {
            switch (v) {
              case "date":
                const date = new Date(currentRoutePart);
                if (isNaN(date.getTime())) {
                  return true;
                }
                g[paramName] = date;
                return false;
              case "number":
                console.log("fjrijfir")
                const num = Number.parseInt(currentRoutePart);
                if (isNaN(num)) {
                  console.log("fff")
                  return true;
                }
                g[paramName] = num;
                console.log("dede")
                return false;
            }
          },
        })
        .map(conversionFailed => conversionFailed ?? Optionable.none())
      }
      else {
        if (currentMatcherPart === currentRoutePart) {

        }
        else {
          return Optionable.none();
        }
      }
    }

    return Optionable.some(g);
  }
}
