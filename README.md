# Sudoku MCP Server

A Cloudflare Worker exposing a small remote MCP server at `/mcp`. It implements
five gameplay tools: `start_game`, `get_game`, `play_move`, `check_game`, and
`reset_game`.

## Local development

```sh
npm install
npm run types
npm test
npm run build
npm run dev
```

The root endpoint is a health response; MCP clients should use
`http://localhost:8787/mcp`.

## Optional secret path

Set the Worker secret `SECRET_PATH` to a hard-to-guess path string to move the
MCP endpoint to `/<SECRET_PATH>/mcp`. For example, a value of `example-secret`
would make the endpoint `/example-secret/mcp`; `/mcp` then returns 404.
When `SECRET_PATH` is unset or empty, the endpoint stays at `/mcp`.

Set the secret in the Cloudflare dashboard or with `npx wrangler secret put
SECRET_PATH`. For local development, place it in a git-ignored `.dev.vars` file.
When enabled, the root health response does not publish the secret path.
Anyone who learns the complete URL can still access the MCP.

## Automatic deployment

Cloudflare Workers Builds connects this repository's `main` branch to the existing `sudoku-mcp` Worker. Pushing to `main` deploys it after the tests and type-check pass. The Worker name and Durable Object binding are declared in `wrangler.jsonc`.

The optional `SECRET_PATH` binding is configured on the production Worker and persists across deployments. For manual deployment, run `npm ci`, `npm test`, `npm run build`, and `npm run deploy`.

## MCP tool annotations

`HARMLESSLY_FAKE_ANNOTATIONS` is an optional compatibility switch for MCP
clients whose safety layer is overly sensitive to ordinary Sudoku state
changes such as entering, erasing, or resetting cells.

- `HARMLESSLY_FAKE_ANNOTATIONS=1` makes every tool advertise
  `readOnlyHint: true`, `destructiveHint: false`, and `openWorldHint: false`.
- `HARMLESSLY_FAKE_ANNOTATIONS=0`, an unset variable, or any other value emits
  no tool annotations.

These annotations are intentionally compatibility metadata rather than a
literal description of every tool's implementation. The server remains a
closed Sudoku game: the affected operations only change reversible game state
and do not modify files, accounts, services, or external systems.

## Authentication

Wrangler uses Cloudflare OAuth for local CLI operations:

```sh
npx wrangler login
npx wrangler whoami
```

This Worker intentionally has no application-level auth or user-account layer,
as specified by the development plan. Add access control at the deployment
boundary before exposing a production endpoint.

## Game behavior

Puzzles are normalized to one 81-character row-major grid. Whitespace is
ignored, `.` and `0` mean empty, and digits `1-9` are givens. `start_game`
accepts only uniquely solvable puzzles and stores the solution privately inside
one SQLite-backed Durable Object per game ID. `play_move` enforces only visible
row/column/box conflicts; `check_game` is the tool that evaluates entries
against the hidden solution. Every state response includes the canonical
initial/current grids and a labeled board rendering.
