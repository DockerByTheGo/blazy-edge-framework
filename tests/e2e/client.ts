import type { createE2eServerApp } from "./server";

type E2eApp = ReturnType<typeof createE2eServerApp>["app"];

export function createE2eClient(app: E2eApp, port: number) {
  return app.createClient().createClient()(`http://localhost:${port}`);
}
