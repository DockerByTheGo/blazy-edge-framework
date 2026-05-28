import type { Optionable } from "@blazyts/better-standard-library";

export type CacheEntry<TValue> = {
  key: string;
  value: TValue;
  createdAt: number;
  expiresAt?: number;
};

export type MaybePromise<T> = T | Promise<T>;

export type ICacheService<TValue = unknown> = {
  config: Record<string, unknown>;
  flush: () => MaybePromise<void>;
  getAll: () => MaybePromise<CacheEntry<TValue>[]>;
  getEntry: (key: string) => MaybePromise<Optionable<TValue>>;
  hasEntry: (key: string) => MaybePromise<boolean>;
  invalidate: (key: string) => MaybePromise<boolean>;
  saveEntry: (key: string, value: TValue, ttl?: number) => MaybePromise<void>;
  setEntry: (key: string, value: TValue, ttl?: number) => MaybePromise<void>;
};
