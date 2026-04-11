import { Hook } from "@blazyts/backend-lib/src/core/types/Hooks/Hooks";
import type { First, Last } from "@blazyts/better-standard-library";

/**
 * A builder class for combining hooks with a fluent API.
 * Allows adding hooks one at a time and building the combined hook with a custom name.
 */
export class HooksCombiner<THooks extends (Hook<any, any>)[], TName extends string> {

    protected constructor(private readonly hooks: THooks, private readonly name: TName) {

    }

    /**
     * Adds a new hook to the combiner chain.
     * 
     * @param v - The hook to add
     * @returns A new HooksCombiner with the hook added
     */
    addHook<TNewHook extends Hook<any, any>>(v: TNewHook): HooksCombiner<[...THooks, TNewHook], TName> {
        this.hooks.push(v)
        return this as any
    }

    /**
     * Builds the final combined hook with all added hooks chained together.
     * 
     * @returns A single hook that chains all added hooks
     */
    build(): Hook<TName, (arg: THooks extends [] ? any : Parameters<First<THooks>["handler"]>[0]) => THooks extends [] ? any : ReturnType<Last<THooks>["handler"]>> {
        return new Hook(
            this.name,
            (arg) => {
                if (this.hooks.length === 0) return arg;
                
                let result: any = arg;
                let asyncStartIndex = -1;
                
                // Execute hooks until we hit an async one
                for (let i = 0; i < this.hooks.length; i++) {
                    result = this.hooks[i].handler(result);
                    if (result instanceof Promise) {
                        asyncStartIndex = i + 1;
                        break;
                    }
                }
                
                // If we encountered an async hook, handle the rest asynchronously
                if (asyncStartIndex !== -1) {
                    return (async () => {
                        // result is already a Promise from the hook that returned it
                        for (let i = asyncStartIndex; i < this.hooks.length; i++) {
                            result = await this.hooks[i].handler(result);
                        }
                        return result;
                    })();
                }
                
                return result;
            }
        ) as any
    }

    /**
     * Creates a new HooksCombiner instance with the given name.
     * 
     * @param name - The name for the combined hook
     * @returns A new HooksCombiner instance
     */
    static new<TName extends string>(name: TName) {
        return new HooksCombiner([], name)
    }
}
