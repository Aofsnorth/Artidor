# @artidor/mcp-server

An [MCP](https://modelcontextprotocol.io) server that lets MCP clients
(Cursor, Claude Desktop, the MCP Inspector, …) drive the **Artidor** editor:
manipulate the timeline, add clips, run commands, edit the project — through
the same validated command vocabulary the in-app AI uses.

## How it works

Artidor is local-first: the editor's state lives in a **browser tab**, so this
process can't run commands itself. It **relays** them into a running editor tab
over a localhost WebSocket:

```
MCP client ──stdio──▶ @artidor/mcp-server ──ws://127.0.0.1:8765──▶ editor tab
```

- The tool catalog is fetched **live** from the connected tab (`tools/list`),
  so there's no duplicated schema — it always matches the editor's build.
- `tools/call` relays the call and returns the editor's result.
- With **no tab connected**, `tools/list` is empty and calls return a clear
  "editor not connected" error.

## Usage

1. **Build:**
   ```bash
   bun install
   cd packages/mcp-server && bun run build
   ```
2. **Run the editor with the relay enabled.** Set the relay URL so the editor
   tab connects to this server, then open the editor (use `http://localhost`
   so the browser allows the `ws://` localhost connection):
   ```bash
   # apps/web/.env.local
   NEXT_PUBLIC_MCP_RELAY_URL=ws://127.0.0.1:8765
   ```
3. **Point your MCP client at the server.** Example MCP client config:
   ```json
   {
     "mcpServers": {
       "artidor": { "command": "node", "args": ["packages/mcp-server/dist/index.js"] }
     }
   }
   ```
   The relay port can be changed with `ARTIDOR_MCP_PORT`.

## Constraints

- **A tab must be open.** This relays into a live editor; it does not render
  headlessly (server-side / headless rendering is a separate roadmap item).
- **Localhost only.** The relay binds to `127.0.0.1`; the editor must reach it
  over `ws://` (works from `http://localhost` dev; `https://` pages may block
  mixed-content `ws://localhost` depending on the browser).
