export * from "./manager";
export * from "./Service";

export function ok<TValue>(value: TValue) {
  return {
    v: { data: value },
    unpack: () => value,
    isOk(): this is { readonly v: { data: TValue } } {
      return true;
    },
    isError(): this is { readonly v: { error: never } } {
      return false;
    },
  };
}

export function error<TError extends string>(value: TError) {
  return {
    v: { error: value },
    unpack: () => {
      throw new Error(value);
    },
    isOk(): this is { readonly v: { data: never } } {
      return false;
    },
    isError(): this is { readonly v: { error: TError } } {
      return true;
    },
  };
}
