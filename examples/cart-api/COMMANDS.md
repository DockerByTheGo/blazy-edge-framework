# Cart API - Quick Test Commands

Server: `http://localhost:3005`
WebSocket base: `ws://localhost:3005`

Notes: run `bun run ./server.ts` (or the example's run script) to start the server on port `3005`.

## HTTP

- GET /hii

```bash
curl -i http://localhost:3005/hii
```

Expected: the handler echoes the incoming context; you'll typically get a JSON response or a 204/404 depending on implementation.

- GET parametrized route: `/:hi/:koko/lolo/:po`

Example:

```bash
curl -i http://localhost:3005/123/abc/lolo/5
```

Expected: every third request returns an object with `hi`, `ko`, `po`; other times it returns `null` or `undefined` (coerced to 204/404 by the framework).

- POST /koko (simple handler returns JSON-stringified ctx)

```bash
curl -i -X POST http://localhost:3005/koko -H "Content-Type: application/json" -d '{"hello":"world"}'
```

Expected: a stringified representation of the handler context (may be returned as JSON by the framework).

- RPC: POST /rpc/getCart (Zod-validated body: `{ id: string }`)

```bash
curl -i -X POST http://localhost:3005/rpc/getCart \
  -H "Content-Type: application/json" \
  -d '{"id":"cart-1"}'
```

Expected: JSON RPC-like response containing the cart items, e.g. `{ items: ["cart 1","cart 2","cart 3"] }`.

## WebSocket (using `websocat`)

Install `websocat` (if needed):

- macOS (Homebrew): `brew install websocat`
- or see https://github.com/vi/websocat for binaries.

Open a WebSocket connection to the example room ID (`room-1`, `room-2`, etc.). The app registers a route at `/ws/:id`.

1) Connect interactively:

```bash
websocat ws://localhost:3005/ws/room-1
```

2) From the `websocat` prompt (or using a one-shot send), send a JSON message for the `new-message` input the example expects. The server expects a JSON message describing the event type and its payload. Example payload (one line):

```json
{"type":"new-message","body":{"content":"hello from websocat"}}
```

If the example app handles the message, you may see server-side logs and, depending on the handler, the server may reply with a message back to the client in a similar JSON shape (for example: `{"type":"new-message","body":{"content":"..."}}`).

3) One-shot send (send then close):

```bash
echo '{"type":"new-message","body":{"content":"one-shot hello"}}' | websocat ws://localhost:3005/ws/room-1
```

4) Example two-way test (open two terminals):

- Terminal A: listen and print incoming messages

```bash
websocat -t ws://localhost:3005/ws/room-1
```

- Terminal B: send a message (as above)

```bash
echo '{"type":"new-message","body":{"content":"hi from B"}}' | websocat ws://localhost:3005/ws/room-1
```

Terminal A should display the server-sent message if the handler forwards/echoes to connected clients.

## Notes / Troubleshooting

- If the server returns a native HTTP `Response`, `curl -i` will show status and headers. The framework may use status codes `201`, `204`, `404` or 500 on errors.
- If the RPC Zod validation fails, the server returns a failed validation response; ensure `Content-Type: application/json` is set and the body matches the schema (`{ "id": "..." }`).
- If WebSocket messages don't appear to work, check the server logs for `Upgrade success:` and any errors printed by the message handler.

If you want, I can also add ready-to-run shell scripts that exercise these endpoints automatically (smoke tests).