import { describe, it, expect, vi } from "vitest";
import { Hook, type HooksDefault } from "@blazyts/backend-lib/src/core/types/Hooks/Hooks";
import { HooksCombiner } from "src/utils/combine-hooks";

describe("HooksCombiner", () => {
    describe("static new", () => {
        it("should create a new HooksCombiner instance with the given name", () => {
            const combiner = HooksCombiner.new("myHook");

            expect(combiner).toBeInstanceOf(HooksCombiner);
        });
    });

    describe("addHook", () => {
        it("should add a single hook to the combiner", () => {
            const hook: Hook<"test", (x: number) => number> = {
                name: "test",
                handler: (x) => x + 1
            };

            const combiner = HooksCombiner.new("combined")
                .addHook(hook);

            const result = combiner.build();
            expect(result.handler(5)).toBe(6);
        });

        it("should allow chaining multiple addHook calls", () => {
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
                handler: (x) => x - 3
            };

            const combiner = HooksCombiner.new("chained")
                .addHook(hook1)
                .addHook(hook2)
                .addHook(hook3);

            const result = combiner.build();
            // (10 + 1) * 2 - 3 = 19
            expect(result.handler(10)).toBe(19);
        });

        it("should maintain type safety across different hook types", () => {
            const hook1: Hook<"numberToString", (x: number) => string> = {
                name: "numberToString",
                handler: (x) => `Number: ${x}`
            };

            const hook2: Hook<"addSuffix", (x: string) => string> = {
                name: "addSuffix",
                handler: (x) => `${x}!!!`
            };

            const combiner = HooksCombiner.new("typed")
                .addHook(hook1)
                .addHook(hook2);

            const result = combiner.build();
            expect(result.handler(42)).toBe("Number: 42!!!");
        });
    });

    describe("build", () => {
        it("should build a hook with the provided name", () => {
            const hook: Hook<"test", (x: number) => number> = {
                name: "test",
                handler: (x) => x + 1
            };

            const combiner = HooksCombiner.new("customName")
                .addHook(hook);

            const result = combiner.build();
            expect(result.name).toBe("customName");
        });

        it("should chain all added hooks in order", () => {
            const executionOrder: string[] = [];

            const hook1: Hook<"first", (x: number) => number> = {
                name: "first",
                handler: (x) => {
                    executionOrder.push("first");
                    return x + 1;
                }
            };

            const hook2: Hook<"second", (x: number) => number> = {
                name: "second",
                handler: (x) => {
                    executionOrder.push("second");
                    return x * 2;
                }
            };

            const hook3: Hook<"third", (x: number) => number> = {
                name: "third",
                handler: (x) => {
                    executionOrder.push("third");
                    return x - 5;
                }
            };

            const combiner = HooksCombiner.new("ordered")
                .addHook(hook1)
                .addHook(hook2)
                .addHook(hook3);

            const result = combiner.build();
            result.handler(10);

            expect(executionOrder).toEqual(["first", "second", "third"]);
        });

        it("should return correct result after chaining hooks", () => {
            const hook1: Hook<"multiply", (x: number) => number> = {
                name: "multiply",
                handler: (x) => x * 5
            };

            const hook2: Hook<"add", (x: number) => number> = {
                name: "add",
                handler: (x) => x + 10
            };

            const combiner = HooksCombiner.new("mathOps")
                .addHook(hook1)
                .addHook(hook2);

            const result = combiner.build();
            // (7 * 5) + 10 = 45
            expect(result.handler(7)).toBe(45);
        });

        it("should work with no hooks added", () => {
            const combiner = HooksCombiner.new("empty");
            const result = combiner.build();

            // With no hooks, should return the input unchanged
            expect(result.handler(42)).toBe(42);
        });

        it("should pass accumulated values through the chain", () => {
            const spy1 = vi.fn((x: number) => x + 100);
            const spy2 = vi.fn((x: number) => x / 2);
            const spy3 = vi.fn((x: number) => x.toString());

            const hook1: Hook<"h1", (x: number) => number> = {
                name: "h1",
                handler: spy1
            };

            const hook2: Hook<"h2", (x: number) => number> = {
                name: "h2",
                handler: spy2
            };

            const hook3: Hook<"h3", (x: number) => string> = {
                name: "h3",
                handler: spy3
            };

            const combiner = HooksCombiner.new("spied")
                .addHook(hook1)
                .addHook(hook2)
                .addHook(hook3);

            const result = combiner.build();
            const output = result.handler(50);

            expect(spy1).toHaveBeenCalledWith(50);
            expect(spy2).toHaveBeenCalledWith(150); // 50 + 100
            expect(spy3).toHaveBeenCalledWith(75); // 150 / 2
            expect(output).toBe("75");
        });

        it("should handle object transformations", () => {
            const hook1: Hook<"addProp", (x: { id: number }) => { id: number; name: string }> = {
                name: "addProp",
                handler: (x) => ({ ...x, name: "John" })
            };

            const hook2: Hook<"addAnotherProp", (x: { id: number; name: string }) => { id: number; name: string; active: boolean }> = {
                name: "addAnotherProp",
                handler: (x) => ({ ...x, active: true })
            };

            const combiner = HooksCombiner.new("objectChain")
                .addHook(hook1)
                .addHook(hook2);

            const result = combiner.build();
            const output = result.handler({ id: 1 });

            expect(output).toEqual({ id: 1, name: "John", active: true });
        });

        it("should support async hooks", async () => {
            const hook1  = new Hook(
                "asyncDouble",
                 async (x) => x * 2
            )

            const hook2: Hook = new Hook(
                 "asyncAdd",
                 async (x) => x + 20
            );

            const combiner = HooksCombiner.new("asyncChain")
                .addHook(hook1)
                .addHook(hook2);

            const result = combiner.build();
            const output = await result.handler(15);

            expect(output).toBe(50); // (15 * 2) + 20
        });
    });

    describe("integration tests", () => {
        it("should work with complex pipeline", () => {
            interface User {
                name: string;
                age: number;
            }

            interface UserWithEmail extends User {
                email: string;
            }

            interface UserWithEmailAndId extends UserWithEmail {
                id: string;
            }

            const addEmail: Hook<"addEmail", (u: User) => UserWithEmail> = {
                name: "addEmail",
                handler: (u) => ({ ...u, email: `${u.name.toLowerCase()}@example.com` })
            };

            const addId: Hook<"addId", (u: UserWithEmail) => UserWithEmailAndId> = {
                name: "addId",
                handler: (u) => ({ ...u, id: Math.random().toString(36).substr(2, 9) })
            };

            const combiner = HooksCombiner.new("userPipeline")
                .addHook(addEmail)
                .addHook(addId);

            const result = combiner.build();
            const output = result.handler({ name: "Alice", age: 30 });

            expect(output.name).toBe("Alice");
            expect(output.age).toBe(30);
            expect(output.email).toBe("alice@example.com");
            expect(output.id).toBeDefined();
            expect(typeof output.id).toBe("string");
        });

        it("should allow building multiple times", () => {
            const hook: Hook<"increment", (x: number) => number> = {
                name: "increment",
                handler: (x) => x + 1
            };

            const combiner = HooksCombiner.new("reusable")
                .addHook(hook);

            const result1 = combiner.build();
            const result2 = combiner.build();

            expect(result1.handler(5)).toBe(6);
            expect(result2.handler(10)).toBe(11);
        });
    });
});
