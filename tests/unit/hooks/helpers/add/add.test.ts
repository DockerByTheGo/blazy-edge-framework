import { describe, it, expect } from "bun:test";
import { add } from "src/hooks/add";

describe("add function", () => {
  it("should merge two objects", () => {
    const existing = { a: 1, b: 2 };
    const toAdd = { c: 3, d: 4 };
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  it("should overwrite existing keys", () => {
    const existing = { a: 1, b: 2 };
    const toAdd = { b: 999, c: 3 };
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({ a: 1, b: 999, c: 3 });
  });

  it("should handle empty objects", () => {
    const existing = {};
    const toAdd = { a: 1 };
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({ a: 1 });
  });

  it("should handle empty toAdd", () => {
    const existing = { a: 1 };
    const toAdd = {};
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({ a: 1 });
  });

  it("should handle both empty", () => {
    const existing = {};
    const toAdd = {};
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({});
  });

  it("should work with nested objects", () => {
    const existing = { a: { x: 1 }, b: 2 };
    const toAdd = { c: { y: 3 } };
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({
      a: { x: 1 },
      b: 2,
      c: { y: 3 },
    });
  });

  it("should work with mixed value types", () => {
    const existing = { a: 1, b: "hello", c: true, d: null };
    const toAdd = { e: [1, 2, 3], f: { nested: true } };
    const result = add(existing, toAdd);

    expect(result(existing)).toEqual({
      a: 1,
      b: "hello",
      c: true,
      d: null,
      e: [1, 2, 3],
      f: { nested: true },
    });
  });
});
