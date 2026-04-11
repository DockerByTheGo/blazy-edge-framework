import { describe, expect, it } from "bun:test";
import { fileURLToPath } from "node:url";
import { BlazyConstructor } from "src/app/constructors";
import type { FileClientRepresentation } from "src/route/handlers/variations/file/File";


describe("File route handler client surface", () => {
  it("provides a typed http handler for downloading files", () => {
    const fixturePath = fileURLToPath(
      new URL("./__fixtures__/mock-file.txt", import.meta.url),
    );

    const route = "/downloads/mock-route.txt";
    const app = BlazyConstructor.createEmpty().file(fixturePath, route);
    const client = app.createClient().createClient()("http://localhost:3000");

    const fileClient = client.routes.downloads["mock-route.txt"]["/"].static;


    const typedClient: FileClientRepresentation = fileClient;

    expect(fileClient.type).toBe("file");
    expect(fileClient.name).toBe("mock-route.txt");
    expect(fileClient.mimeType).toBe("text/plain");
    expect(fileClient.url.endsWith("/static/downloads/mock-route.txt")).toBe(true);
    expect(typeof fileClient.download).toBe("function");
    expect(typeof fileClient.stream).toBe("function");

    expect(typedClient).toBe(fileClient);
  });
});
