import { describe, expect, it, vi } from "vitest";

import { createPortFallbackIterator, listenWithPortFallback } from "./ports";

describe("port fallback helpers", () => {
  it("returns fallback ports in order", () => {
    const ports = createPortFallbackIterator([3005, 3006, 3007]);

    expect(ports.next()).toBe(3005);
    expect(ports.next()).toBe(3006);
    expect(ports.next()).toBe(3007);
  });

  it("tries the next fallback port when listening fails", () => {
    const listen = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("port in use");
      })
      .mockImplementationOnce(port => ({ port }));

    const server = listenWithPortFallback(listen, [3005, 3006]);

    expect(server.port).toBe(3006);
    expect(listen).toHaveBeenCalledWith(3005);
    expect(listen).toHaveBeenCalledWith(3006);
  });

  it("panics after all fallback ports are exhausted", () => {
    expect(() =>
      listenWithPortFallback(() => {
        throw new Error("port in use");
      }, [3005, 3006]),
    ).toThrow("all fallback ports are in use: 3005, 3006");
  });
});
