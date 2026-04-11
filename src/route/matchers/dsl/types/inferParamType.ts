import type { ContainsAtTheEnd } from "./utils";

export type InferParamType<Param extends string>
  = ContainsAtTheEnd<Param, "$"> extends true
    ? number
    : ContainsAtTheEnd<Param, "("> extends true
      ? Date
      : ContainsAtTheEnd<Param, "^"> extends true
        ? boolean
        : string;
