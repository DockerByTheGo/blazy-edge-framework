import type { URecord } from "@blazyts/better-standard-library";

export function tap<TCtx>(
  func: (ctx: TCtx) => URecord
): (arg: TCtx) => TCtx {
  return (ctx: TCtx) => {
    func(ctx);
    return ctx;
  };
}






