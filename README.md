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

## Automatic deployment

`.github/workflows/deploy.yml` runs the tests and type-check on pull requests.
After a change reaches `main`, it deploys the Worker automatically. Configure
these GitHub Actions secrets before the first production deployment:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token permitted to deploy this Worker.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account identifier for this Worker.

The token must be stored as a GitHub secret, never committed to the repository.

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
