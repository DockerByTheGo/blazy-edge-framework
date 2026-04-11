

type Subscribeable<T extends Record<string, (value: unknown) => any>> = {
  [K in keyof T]: {
    invoke: (v: Parameters<T[K]>) => ReturnType<T[K]>;
    on: (v: Parameters<T[K]>) => void;
  }
};

function createSubscribeable<T extends Record<string, (value: unknown) => any>>(v: T): Subscribeable<T> {
  const result = {} as any;
  for (const key in v) {
    if (Object.prototype.hasOwnProperty.call(v, key)) {
      const handler = v[key]!;
      result[key] = {
        invoke: (args: Parameters<typeof handler>) => handler.apply(null, args),
        on: (args: Parameters<typeof handler>) => handler.apply(null, args),
      };
    }
  }
  return result;
}
