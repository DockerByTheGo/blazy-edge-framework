import type { Optionable, SimpleResult } from "@blazyts/better-standard-library";


export type CacheEntry<TValue> = {
  key: string;
  value: TValue;
  createdAt: number;
  expiresAt?: number;
};

export type MaybePromise<T> = T | Promise<T>;
export type CacheServiceError = "failed";
export type CacheResult<TValue> = SimpleResult<TValue, CacheServiceError>;

export type ICacheService<TValue = unknown> = {
  config: Record<string, unknown>;
  flush: () => MaybePromise<CacheResult<void>>;
  getAll: () => MaybePromise<CacheResult<CacheEntry<TValue>[]>>;
  getEntry: (key: string) => MaybePromise<CacheResult<Optionable<TValue>>>;
  hasEntry: (key: string) => MaybePromise<CacheResult<boolean>>;
  invalidate: (key: string) => MaybePromise<CacheResult<boolean>>;
  saveEntry: (key: string, value: TValue, ttl?: number) => MaybePromise<CacheResult<void>>;
  setEntry: (key: string, value: TValue, ttl?: number) => MaybePromise<CacheResult<void>>;
};

export type ICache<TValue = unknown> = ICacheService<TValue>;
