import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

describe("beforeRequestHandler()", () => {
  it("returns a Blazy instance (method chaining works)", () => {
    const app = BlazyConstructor.createEmpty().beforeRequestHandler(
      "addField",
      ctx => ({ ...ctx, extra: true }),
    );

    // If it returns correctly we can keep chaining
    expect(app).toBeDefined();
    expect(typeof app.post).toBe("function");
  });

  it("can be chained multiple times", () => {
    const app = BlazyConstructor.createEmpty()
      .beforeRequestHandler("step1", ctx => ({ ...ctx, step1: true }))
      .beforeRequestHandler("step2", ctx => ({ ...ctx, step2: true }));

    expect(app).toBeDefined();
  });

  it("hooks are stored on the instance", () => {
    const app = BlazyConstructor.createEmpty().beforeRequestHandler(
      "myHook",
      ctx => ctx,
    );

    // routerHooks.beforeHandler.v should contain the added hook
    const hooks = (app as any).routerHooks?.beforeHandler?.v ?? [];
    const names = hooks.map((h: any) => h.name);
    expect(names).toContain("myHook");
  });
});
