import type { Hook } from "@blazyts/backend-lib/src/core/types/Hooks/Hooks";
import type { First, Last } from "@blazyts/better-standard-library";

/**
 * Combines multiple hooks into a single hook that chains their handlers sequentially.
 * The output of each hook becomes the input to the next hook.
 * 
 * @param hooks - Array of hooks to combine
 * @returns A single hook that chains all provided hooks
 */
export function combineHooks<THooks extends Hook<any, any>[]>(
    ...hooks: THooks
): Hook<string, (arg: First<THooks>["TGetArgType"]) => Last<THooks>["TGetReturnType"]> {
    return {
        name: hooks.map(h => h.name).join(" -> "),
        handler: arg => hooks.reduce((acc, hook) => hook.handler(acc), arg)
    } as any;
}
