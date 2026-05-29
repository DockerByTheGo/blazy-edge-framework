import { fileURLToPath } from "node:url";

import { describe, expect, expectTypeOf, it } from "vitest";

import type { FileClientRepresentation } from "src/route/handlers/variations/file/File";
import { FileRouteHandler } from "src/route/handlers/variations/file/File";

describe("FileRouteHandler", () => {
  const fixturePath = fileURLToPath(
    new URL("../__fixtures__/mock-file.txt", import.meta.url),
  );

  it("handleRequest returns a file response for an existing file", async () => {
    const handler = new FileRouteHandler(fixturePath, "/downloads/mock-file.txt");
    const response = handler.handleRequest() as unknown as Response;

    expectTypeOf(handler.handleRequest).returns.toEqualTypeOf<Record<string, unknown>>();
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(response.headers.get("content-disposition")).toBe("inline; filename=\"mock-file.txt\"");
    await expect(response.text()).resolves.toContain("mock");
  });

  it("handleRequest returns a not found response for a missing file", async () => {
    const handler = new FileRouteHandler("/missing/file.txt", "/downloads/file.txt");
    const response = handler.handleRequest() as unknown as Response;

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "File not found" });
  });

  it("getClientRepresentation returns file client metadata and helpers", () => {
    const handler = new FileRouteHandler(fixturePath, "/downloads/mock-file.txt");
    const fileClient = handler.getClientRepresentation({
      serverUrl: "http://localhost:3000/static/downloads/mock-file.txt",
      subRoute: "/static/downloads/mock-file.txt",
    });

    expectTypeOf(fileClient).toEqualTypeOf<FileClientRepresentation>();
    expectTypeOf(fileClient.download).returns.toEqualTypeOf<Promise<Response>>();
    expectTypeOf(fileClient.stream).returns.toEqualTypeOf<Promise<ReadableStream<Uint8Array> | null>>();
    expect(fileClient.type).toBe("file");
    expect(fileClient.name).toBe("mock-file.txt");
    expect(fileClient.mimeType).toBe("text/plain");
    expect(fileClient.url).toBe("http://localhost:3000/static/downloads/mock-file.txt");
    expect(typeof fileClient.download).toBe("function");
    expect(typeof fileClient.stream).toBe("function");
  });
});
