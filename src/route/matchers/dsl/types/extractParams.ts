import type { ContainsAtTheStart, RemoveNonAlphabetic } from "@blazyts/better-standard-library";
import type { Optionable } from "@blazyts/better-standard-library/src/data_structures/functional-patterns/option/main";

import type { InferParamType } from "./inferParamType";

export type ExtractParams<
  T extends string,
  ReturnType extends Record<string, string> = {},
> = T extends `/${infer CurrentParam}`
  ? CurrentParam extends `:${infer ParamName}`
    ? ParamName extends `${infer Param}/${infer Rest}`
      ? ExtractParams<
        `/${Rest}`,
        {
          [P in Param as RemoveNonAlphabetic<P>]: ContainsAtTheStart<Param, "?"> extends true ? Optionable<InferParamType<Param>> : InferParamType<Param>
        }
        & {
          [P in keyof ReturnType]: ReturnType[P]
        }
      >
      : { [P in keyof ReturnType]: ReturnType[P] } & { [p in ParamName]: string }
    : CurrentParam extends `${infer NotDynamicParam}/${infer Rest}`
      ? ExtractParams<`/${Rest}`, ReturnType>
      : ReturnType
  : never;

export function extractParams<T extends string>(path: T): ExtractParams<T> {
  return {} as ExtractParams<T>;
}
