import path from "node:path";

const FILE_ROUTE_PREFIX = "/static";

const MIME_TYPES: Record<string, string> = {
  ".txt": "text/plain",
  ".json": "application/json",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".ts": "application/typescript",
  ".jsx": "text/jsx",
  ".tsx": "text/tsx",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

const sanitizeRouteSegments = (route: string) => {
  const normalized = route.replace(/\\/g, "/");
  const segments = normalized
    .split("/")
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0 && segment !== ".");

  if (segments.some(segment => segment === "..")) {
    throw new Error("File routes may not contain '..' segments");
  }

  return segments;
};

export function normalizeFileRoute(route: string): string {
  const segments = sanitizeRouteSegments(route);
  const routePrefix = FILE_ROUTE_PREFIX.replace(/^\//, "");
  const sanitizedSegments = [...segments];

  if (sanitizedSegments[0] === routePrefix) {
    sanitizedSegments.shift();
  }

  if (sanitizedSegments.length === 0) {
    return FILE_ROUTE_PREFIX;
  }

  const joined = sanitizedSegments.join("/");
  const candidate = `${FILE_ROUTE_PREFIX}/${joined}`.replace(/\/+/g, "/");

  if (candidate !== FILE_ROUTE_PREFIX && candidate.endsWith("/")) {
    return candidate.slice(0, -1);
  }

  return candidate;
}

export function resolveServerFilePath(filePath: string): string {
  if (!filePath || !filePath.trim()) {
    throw new Error("File path cannot be empty");
  }

  const normalized = path.normalize(filePath);
  const resolved = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(process.cwd(), normalized);

  return resolved;
}

export function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}
