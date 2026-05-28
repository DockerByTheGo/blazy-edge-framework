import { Path } from "@blazyts/backend-lib/src/core/server/router/utils/path/Path";
import { describe, expect, it } from "vitest";

import { BlazyConstructor } from "src/app/constructors";
import { HtmlResponse, JsonResponse, TextResponse } from "src/response";
import { treeRouteFinder } from "src/route/finders/tree";

describe("hTTP handlers", () => {
  it("registers and resolves a GET handler on a hardcoded path", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/health",
      handler: () => ({ body: { ok: true, type: "hardcoded-get" } }),
      args: undefined,
    });

    const protocols = treeRouteFinder(app.routes, new Path("/health")).unpack().raw as any;

    expect(protocols.GET).toBeDefined();
    expect(protocols.POST).toBeUndefined();
    expect(protocols.GET.handleRequest({})).toEqual({
      body: { ok: true, type: "hardcoded-get" },
    });
  });

  it("registers and resolves a GET handler on a dynamic path", () => {
    const app = BlazyConstructor.createEmpty().get({
      path: "/users/:id",
      handler: ctx => ({
        body: {
          id: ctx.request.params.get("id"),
          requestParamId: ctx.request.params.get("id"),
          type: "dynamic-get",
        },
      }),
      args: undefined,
    });

    const protocols = treeRouteFinder(app.routes, new Path("/users/42")).unpack().raw as any;

    expect(protocols.GET).toBeDefined();
    expect(protocols.GET.handleRequest({})).toEqual({
      body: { id: "42", requestParamId: "42", type: "dynamic-get" },
    });
  });

  it("registers and resolves a POST handler on a hardcoded path", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/posts/create",
      handler: ctx => ({
        body: { created: true, title: ctx.request.body.get("title"), type: "hardcoded-post" },
      }),
    });

    const protocols = treeRouteFinder(app.routes, new Path("/posts/create")).unpack().raw as any;

    expect(protocols.POST).toBeDefined();
    expect(protocols.GET).toBeUndefined();
    expect(protocols.POST.handleRequest({ title: "hello" })).toEqual({
      body: { created: true, title: "hello", type: "hardcoded-post" },
    });
  });

  it("registers and resolves a POST handler on a dynamic path", () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/users/:userId/posts/:postId",
      handler: ctx => ({
        body: {
          userId: ctx.request.params.get("userId"),
          postId: ctx.request.params.get("postId"),
          content: ctx.request.body.get("content"),
          type: "dynamic-post",
        },
      }),
    });

    const protocols = treeRouteFinder(app.routes, new Path("/users/7/posts/11")).unpack().raw as any;

    expect(protocols.POST).toBeDefined();
    expect(protocols.POST.handleRequest({
      body: { content: "hello world" },
    })).toEqual({
      body: {
        userId: "7",
        postId: "11",
        content: "hello world",
        type: "dynamic-post",
      },
    });
  });

  it("allows handlers to return WHATWG Response helpers", async () => {
    const app = BlazyConstructor.createEmpty()
      .get({
        path: "/page",
        handler: () => HtmlResponse("<h1>Hello</h1>"),
        args: undefined,
      })
      .get({
        path: "/api",
        handler: () => JsonResponse({ ok: true }),
        args: undefined,
      })
      .get({
        path: "/plain",
        handler: () => TextResponse("hello"),
        args: undefined,
      });

    const pageProtocols = treeRouteFinder(app.routes, new Path("/page")).unpack().raw as any;
    const apiProtocols = treeRouteFinder(app.routes, new Path("/api")).unpack().raw as any;
    const plainProtocols = treeRouteFinder(app.routes, new Path("/plain")).unpack().raw as any;
    const pageResponse = pageProtocols.GET.handleRequest({});
    const apiResponse = apiProtocols.GET.handleRequest({});
    const plainResponse = plainProtocols.GET.handleRequest({});

    expect(pageResponse).toBeInstanceOf(Response);
    expect(pageResponse.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await pageResponse.text()).toBe("<h1>Hello</h1>");
    expect(apiResponse.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await apiResponse.json()).toEqual({ ok: true });
    expect(plainResponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await plainResponse.text()).toBe("hello");
  });

  it("provides an organized REST ctx with WHATWG Response helpers", async () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/ctx",
      handler: ctx => ctx.response.standard({
        body: ctx.request.body.raw(),
        header: ctx.request.headers.get("x-request-id"),
        method: ctx.request.method,
        params: ctx.request.params.raw(),
        path: ctx.request.path,
        query: ctx.request.query,
        whatwgMethod: ctx.request.whatwg().method,
        whatwgUrl: ctx.request.whatwg().url,
        hasInput: "input" in ctx,
        hasLegacyReqData: "reqData" in ctx,
        hasTopLevelParams: "params" in ctx,
      }),
    });

    const protocols = treeRouteFinder(app.routes, new Path("/ctx")).unpack().raw as any;
    const response = protocols.POST.handleRequest({
      reqData: {
        url: "/ctx?debug=true&tag=a&tag=b",
        protocol: "POST",
        verb: "POST",
        body: { ok: true },
        headers: { "x-request-id": "req_123" },
      },
    });

    expect(response).toBeInstanceOf(Response);
    await expect(response.json()).resolves.toEqual({
      body: { ok: true },
      header: "req_123",
      method: "POST",
      params: {},
      path: "/ctx",
      query: {
        debug: "true",
        tag: ["a", "b"],
      },
      whatwgMethod: "POST",
      whatwgUrl: "http://blazy.local/ctx?debug=true&tag=a&tag=b",
      hasInput: false,
      hasLegacyReqData: false,
      hasTopLevelParams: false,
    });
  });

  it("creates a WHATWG Request from ctx.request", async () => {
    const app = BlazyConstructor.createEmpty().post({
      path: "/whatwg",
      handler: async (ctx) => {
        const request = ctx.request.whatwg();

        return {
          body: {
            method: request.method,
            contentType: request.headers.get("content-type"),
            body: await request.json(),
          },
        };
      },
    });

    const protocols = treeRouteFinder(app.routes, new Path("/whatwg")).unpack().raw as any;

    await expect(protocols.POST.handleRequest({
      reqData: {
        url: "http://localhost:3005/whatwg",
        protocol: "POST",
        verb: "POST",
        body: { ok: true },
        headers: { "content-type": "application/json" },
      },
    })).resolves.toEqual({
      body: {
        method: "POST",
        contentType: "application/json",
        body: { ok: true },
      },
    });
  });

  it("registers html GET routes from a string or file path", async () => {
    const htmlFilePath = new URL("./__fixtures__/page.html", import.meta.url).pathname;
    const app = BlazyConstructor.createEmpty()
      .html({
        path: "/inline-html",
        html: "<main>Inline</main>",
      })
      .html({
        path: "/file-html",
        filePath: htmlFilePath,
      });

    const inlineProtocols = treeRouteFinder(app.routes, new Path("/inline-html")).unpack().raw as any;
    const fileProtocols = treeRouteFinder(app.routes, new Path("/file-html")).unpack().raw as any;
    const inlineResponse = inlineProtocols.GET.handleRequest({});
    const fileResponse = fileProtocols.GET.handleRequest({});

    expect(inlineProtocols.POST).toBeUndefined();
    expect(inlineResponse).toBeInstanceOf(Response);
    expect(inlineResponse.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await inlineResponse.text()).toBe("<main>Inline</main>");
    expect(fileResponse).toBeInstanceOf(Response);
    expect(fileResponse.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await fileResponse.text()).toBe("<main>From file</main>\n");
  });
});
