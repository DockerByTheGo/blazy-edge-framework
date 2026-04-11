type ResponseBody = BodyInit | null;

const withDefaultHeader = (
  init: ResponseInit | undefined,
  name: string,
  value: string,
): ResponseInit => {
  const headers = new Headers(init?.headers);

  if (!headers.has(name)) {
    headers.set(name, value);
  }

  return {
    ...init,
    headers,
  };
};

export const HtmlResponse = (html: BodyInit, init?: ResponseInit): Response =>
  new Response(
    html,
    withDefaultHeader(init, "content-type", "text/html; charset=utf-8"),
  );

export const HtmlFileResponse = (filePath: string, init?: ResponseInit): Response =>
  HtmlResponse(Bun.file(filePath), init);

export const JsonResponse = (data: unknown, init?: ResponseInit): Response =>
  new Response(
    JSON.stringify(data) ?? "null",
    withDefaultHeader(init, "content-type", "application/json; charset=utf-8"),
  );

export const TextResponse = (text: string, init?: ResponseInit): Response =>
  new Response(
    text,
    withDefaultHeader(init, "content-type", "text/plain; charset=utf-8"),
  );

export const ResponseWithBody = (
  body: ResponseBody,
  init?: ResponseInit,
): Response => new Response(body, init);

export const EmptyResponse = (init?: ResponseInit): Response =>
  new Response(null, init);

export const RedirectResponse = (
  url: string | URL,
  status: 301 | 302 | 303 | 307 | 308 = 302,
): Response => Response.redirect(url, status);
