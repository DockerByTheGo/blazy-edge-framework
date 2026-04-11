import type { IOptionable, IResultable, URecord } from "@blazyts/better-standard-library";
import type z from "zod/v4";
import type { ServiceDefault } from "../../main/Service";

type CacheEntry<T> = {
    key: string,
    value: T,
    timestamp: number
}

export interface Cache<TEntries extends {
    [module: string]: z.ZodObject
} extends ServiceDefault> {
    entries : {[key in keyof TEntries]: {
        flush: ()   => void,
        getAll: () => z.infer<(CacheEntry<TEntries[key]>)[]>,
        getEntry(key: string): z.infer<IOptionable<CacheEntry<TEntries[key]>>>
        saveEntry(key: string, value: z.infer<TEntries[key]>): void
        invalidate(key: string): Promise<IResultable<{}, ["not-found"]>>
    }}
}