# kdl-examples MCP server

A remote MCP (Model Context Protocol) server exposing Keystone
Dashboard Layout's real code examples (Vue/React/Angular, 53 each) as
tools an MCP client (Claude, or anything else that speaks MCP) can
call. Built to run on plain PHP shared hosting — no Node process, no
persistent connection, no SSE. Each request is a single synchronous
JSON-RPC call/response, exactly like a normal PHP page.

## How it works

- `build-index.mjs` — run **locally**, never on the PHP host. Walks
  the real example sources in `astro-docs/` (Vue/React) and
  `angular-examples-app/` (Angular) and writes `examples-index.json`.
- `mcp.php` — the actual server. Reads `examples-index.json` per
  request and answers MCP's `initialize`/`tools/list`/`tools/call`
  JSON-RPC methods. Both files must be uploaded to the same directory.
- `examples-index.json` — generated data, not source. Regenerate and
  re-upload it whenever an example changes.

## Tools it exposes

| Tool | Purpose |
|---|---|
| `search_examples` | Keyword search over title/description/slug — returns matches without full source (keeps responses small) |
| `get_example` | Fetch one example's real, full source by `framework` + `slug` |
| `list_examples` | Browse everything, optionally filtered by framework |

## Building the index

```sh
cd mcp-server
node build-index.mjs
```

Prints how many examples it found (should be 159: 53 × 3 frameworks)
and writes `examples-index.json` in this directory. Re-run this any
time an example's source or its `.mdx` title/description changes, then
re-upload the JSON file.

## Deploying

Upload `mcp.php` and `examples-index.json` to the same directory on
your PHP host — e.g. `https://kdl.winnem.tech/mcp/mcp.php`. That's the
entire deployment; there's no build step, dependency install, or
process to start on the host itself.

## Testing it directly

Once uploaded, verify it with `curl` before pointing a client at it:

```sh
curl -s https://kdl.winnem.tech/mcp/mcp.php \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

curl -s https://kdl.winnem.tech/mcp/mcp.php \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_examples","arguments":{"query":"undo"}}}'
```

Each should return a single JSON object (`{"jsonrpc":"2.0","id":...,"result":{...}}`),
not an error or an empty body. If you get a PHP error/warning printed
instead of JSON, check your host's PHP version supports the syntax
used here (plain PHP 7.4+ features only — no exotic dependencies) and
that `examples-index.json` actually made it into the same directory.

## Registering it as a remote MCP server

**Claude Code** — add to `.mcp.json`:

```json
{
  "mcpServers": {
    "kdl-examples": {
      "type": "http",
      "url": "https://kdl.winnem.tech/mcp/mcp.php"
    }
  }
}
```

**Claude.ai (web/desktop)** — add it under remote MCP connectors in
settings, using the same URL.

Anyone you share the URL with can add it the same way — it's a public,
read-only endpoint with no authentication, matching the fact that it
only ever serves already-public documentation content.

## Known limitations

- No caching layer — each request re-reads and re-parses the full
  JSON index file. Fine at this size (159 examples); revisit if the
  example catalog grows by an order of magnitude.
- No auth. Add a bearer-token check in `mcp.php` if you ever need to
  restrict access — see that file's own top comment for where CORS/
  method handling already lives, add the check right after that.
- SSE/streaming is not implemented (deliberately — see `mcp.php`'s own
  comment). Fine for this tool shape; would need a different host if
  you ever needed genuine server-push instead of request/response.
