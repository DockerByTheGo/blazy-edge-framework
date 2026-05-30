import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";

import { getProtocols } from "../utils/routeTree";

describe("html()", () => {
  it("registers an inline HTML GET route", async () => {
    const app = BlazyConstructor.createEmpty().html({
      path: "/inline-html",
      html: "<main>Inline</main>",
    });

    const protocols = getProtocols(app.routes, "/inline-html");
    const response = protocols.GET.handleRequest({});

    expect(protocols.POST).toBeUndefined();
    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    await expect(response.text()).resolves.toBe("<main>Inline</main>");
  });

  it("registers a file-backed HTML GET route", async () => {
    const htmlFilePath = new URL("../../route/handlers/__fixtures__/page.html", import.meta.url).pathname;
    const app = BlazyConstructor.createEmpty().html({
      path: "/file-html",
      filePath: htmlFilePath,
    });

    const protocols = getProtocols(app.routes, "/file-html");
    const response = protocols.GET.handleRequest({});

    expect(response).toBeInstanceOf(Response);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    await expect(response.text()).resolves.toBe("<main>From file</main>\n");
  });
});
