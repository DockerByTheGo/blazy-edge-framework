import { describe, it, expect, vi } from "vitest";
import type { Hook } from "@blazyts/backend-lib/src/core/types/Hooks/Hooks";
import { combineHooks } from "src/utils/combine-hooks";

describe("combineHooks", () => {
    it("should combine multiple hooks into a single hook", () => {
        const hook1: Hook<"hook1", (x: number) => number> = {
            name: "hook1",
            handler: (x) => x + 1
        };

        const hook2: Hook<"hook2", (x: number) => number> = {
            name: "hook2",
            handler: (x) => x * 2
        };

        const hook3: Hook<"hook3", (x: number) => number> = {
            name: "hook3",
            handler: (x) => x - 5
        };

        const combined = combineHooks(hook1, hook2, hook3);

        // Test the handler: (10 + 1) * 2 - 5 = 17
        const result = combined.handler(10);
        expect(result).toBe(17);
    });

    it("should create a combined name by joining hook names with ' -> '", () => {
        const hook1: Hook<"add", (x: number) => number> = {
            name: "add",
            handler: (x) => x + 1
        };

        const hook2: Hook<"multiply", (x: number) => number> = {
            name: "multiply",
            handler: (x) => x * 2
        };

        const combined = combineHooks(hook1, hook2);

        expect(combined.name).toBe("add -> multiply");
    });

    it("should work with a single hook", () => {
        const hook: Hook<"single", (x: string) => string> = {
            name: "single",
            handler: (x) => x.toUpperCase()
        };

        const combined = combineHooks(hook);

        expect(combined.name).toBe("single");
        expect(combined.handler("hello")).toBe("HELLO");
    });

    it("should chain hooks with different types", () => {
        const hook1: Hook<"toString", (x: number) => string> = {
            name: "toString",
            handler: (x) => `Value: ${x}`
        };

        const hook2: Hook<"addExclamation", (x: string) => string> = {
            name: "addExclamation",
            handler: (x) => `${x}!`
        };

        const hook3: Hook<"toUpperCase", (x: string) => string> = {
            name: "toUpperCase",
            handler: (x) => x.toUpperCase()
        };

        const combined = combineHooks(hook1, hook2, hook3);

        const result = combined.handler(42);
        expect(result).toBe("VALUE: 42!");
    });

    it("should pass the accumulated result through each hook", () => {
        const spy1 = vi.fn((x: number) => x + 10);
        const spy2 = vi.fn((x: number) => x * 3);
        const spy3 = vi.fn((x: number) => x - 5);

        const hook1: Hook<"h1", (x: number) => number> = {
            name: "h1",
            handler: spy1
        };

        const hook2: Hook<"h2", (x: number) => number> = {
            name: "h2",
            handler: spy2
        };

        const hook3: Hook<"h3", (x: number) => number> = {
            name: "h3",
            handler: spy3
        };

        const combined = combineHooks(hook1, hook2, hook3);
        combined.handler(5);

        expect(spy1).toHaveBeenCalledWith(5);
        expect(spy2).toHaveBeenCalledWith(15); // 5 + 10
        expect(spy3).toHaveBeenCalledWith(45); // 15 * 3
    });

    it("should handle hooks with object transformations", () => {
        const hook1: Hook<"addField", (x: { a: number }) => { a: number; b: string }> = {
            name: "addField",
            handler: (x) => ({ ...x, b: "added" })
        };

        const hook2: Hook<"addAnotherField", (x: { a: number; b: string }) => { a: number; b: string; c: boolean }> = {
            name: "addAnotherField",
            handler: (x) => ({ ...x, c: true })
        };

        const combined = combineHooks(hook1, hook2);

        const result = combined.handler({ a: 42 });
        expect(result).toEqual({ a: 42, b: "added", c: true });
    });

    it("should preserve the order of hook execution", () => {
        const executionOrder: string[] = [];

        const hook1: Hook<"first", (x: number) => number> = {
            name: "first",
            handler: (x) => {
                executionOrder.push("first");
                return x;
            }
        };

        const hook2: Hook<"second", (x: number) => number> = {
            name: "second",
            handler: (x) => {
                executionOrder.push("second");
                return x;
            }
        };

        const hook3: Hook<"third", (x: number) => number> = {
            name: "third",
            handler: (x) => {
                executionOrder.push("third");
                return x;
            }
        };

        const combined = combineHooks(hook1, hook2, hook3);
        combined.handler(0);

        expect(executionOrder).toEqual(["first", "second", "third"]);
    });

    it("should handle async hook handlers", async () => {
        const hook1: Hook<"asyncAdd", (x: number) => Promise<number>> = {
            name: "asyncAdd",
            handler: async (x) => x + 5
        };

        const hook2: Hook<"asyncMultiply", (x: number) => Promise<number>> = {
            name: "asyncMultiply",
            handler: async (x) => x * 2
        };

        const combined = combineHooks(hook1, hook2);

        const result = await combined.handler(10);
        expect(result).toBe(30); // (10 + 5) * 2
    });
});
