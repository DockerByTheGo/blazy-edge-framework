import { expect } from "vitest";

import { WebSocket as MockWebSocket } from "../mocks/bun";

declare module "vitest" {
  interface Assertion<T = unknown> {
    toBeFunction(): T;
  }

  interface AsymmetricMatchersContaining {
    toBeFunction(): unknown;
  }
}

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

(globalThis as any).WebSocket = MockWebSocket;
