import { Hook } from "@blazyts/backend-lib/src/core/types/Hooks/Hooks";
import type { First, Last } from "@blazyts/better-standard-library";

export function combineHooks<THooks extends Hook<any, any>[]>(...hooks: THooks): Hook<
    string,
    (arg: Parameters<First<THooks>["handler"]>[0]) => ReturnType<Last<THooks>["handler"]>
> {
    return new Hook(
        hooks.map(h => h.name).join(" -> "),
        (arg) => {
            let result: any = arg;
            let asyncStartIndex = -1;
            
            // Execute hooks until we hit an async one
            for (let i = 0; i < hooks.length; i++) {
                result = hooks[i].handler(result);
                if (result instanceof Promise) {
                    asyncStartIndex = i + 1;
                    break;
                }
            }
            
            // If we encountered an async hook, handle the rest asynchronously
            if (asyncStartIndex !== -1) {
                return (async () => {
                    // Await the first Promise
                    result = await result;
                    // Then execute remaining hooks
                    for (let i = asyncStartIndex; i < hooks.length; i++) {
                        result = await hooks[i].handler(result);
                    }
                    return result;
                })();
            }
            
            return result;
        }
    ) as any;
}

export class HooksCombiner<THooks extends (Hook<any, any>)[], TName extends string> {

    protected constructor(private readonly hooks: THooks, private readonly name: TName) {

    }

    addHook<TNewHook extends Hook<any, any>>(v: TNewHook): HooksCombiner<[...THooks, TNewHook], TName> {
        this.hooks.push(v)
        return this as any
    }

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
                        // Await the first Promise
                        result = await result;
                        // Then execute remaining hooks
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

    static new<TName extends string>(name: TName) {
        return new HooksCombiner([], name)
    }
}