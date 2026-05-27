type ResponseBody = BodyInit | null;

type ValidationIssue = {
  path: (string | number)[];
  field: string;
  message: string;
  code: string;
};

export type FailedValidationBody = {
  type: "validation_failed";
  body: {
    message: string;
    issues: ValidationIssue[];
    fieldErrors: Record<string, string[]>;
  };
};

function withDefaultHeader(init: ResponseInit | undefined, name: string, value: string): ResponseInit {
  const headers = new Headers(init?.headers);

  if (!headers.has(name)) {
    headers.set(name, value);
  }

  return {
    ...init,
    headers,
  };
}

export function HtmlResponse(html: BodyInit, init?: ResponseInit): Response {
  return new Response(
    html,
    withDefaultHeader(init, "content-type", "text/html; charset=utf-8"),
  );
}

/*
like the html response but adds the body and doctype fields by default
*/
export function HtmlPageResponse(html: string): Response {
  return new Response(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
</head>
<body>
  ${html}
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
export function HtmlFileResponse(filePath: string, init?: ResponseInit): Response {
  return HtmlResponse(Bun.file(filePath), init);
}

export function JsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(
    JSON.stringify(data) ?? "null",
    withDefaultHeader(init, "content-type", "application/json; charset=utf-8"),
  );
}

export function formatFailedValidation(error: { issues: Array<{ path: (string | number)[]; message: string; code: string }> }): FailedValidationBody {
  const issues = error.issues.map(issue => ({
    path: issue.path,
    field: issue.path.length > 0 ? issue.path.join(".") : "body",
    message: issue.message,
    code: issue.code,
  }));

  return {
    type: "validation_failed",
    body: {
      message: "Request validation failed",
      issues,
      fieldErrors: issues.reduce<Record<string, string[]>>((acc, issue) => {
        acc[issue.field] = [...(acc[issue.field] ?? []), issue.message];
        return acc;
      }, {}),
    },
  };
}

export function FailedValidationResponse(
  error: Parameters<typeof formatFailedValidation>[0],
  init?: ResponseInit,
): Response {
  return JsonResponse(formatFailedValidation(error), {
    status: 400,
    ...init,
  });
}

export function TextResponse(text: string, init?: ResponseInit): Response {
  return new Response(
    text,
    withDefaultHeader(init, "content-type", "text/plain; charset=utf-8"),
  );
}

export function ResponseWithBody(body: ResponseBody, init?: ResponseInit): Response {
  return new Response(body, init);
}

export function EmptyResponse(init?: ResponseInit): Response {
  return new Response(null, init);
}

export function RedirectResponse(url: string | URL, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
  return Response.redirect(url, status);
}
