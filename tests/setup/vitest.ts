import { expect } from "vitest";

/* eslint-disable ts/consistent-type-definitions, ts/method-signature-style */
declare module "vitest" {
  interface Assertion<T = unknown> {
    toBeFunction(): T;
  }

  interface AsymmetricMatchersContaining {
    toBeFunction(): unknown;
  }
}
/* eslint-enable ts/consistent-type-definitions, ts/method-signature-style */

expect.extend({
  toBeFunction(received: unknown) {
    return {
      pass: typeof received === "function",
      message: () => `expected ${String(received)} to be a function`,
    };
  },
});

if (!("Bun" in globalThis)) {
  throw new Error("Tests must run with Bun. Use `bun x --bun vitest run --config vitest.config.ts`.");
}
