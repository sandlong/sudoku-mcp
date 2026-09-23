import { createMcpHandler } from "agents/mcp/server";
import { SudokuGame } from "./durable-objects/sudoku-game";
import type {
  CheckResponse,
  GameSnapshot,
  MoveResponse,
  PreparedPuzzle,
  RpcResult
} from "./game/types";
import { createServer } from "./mcp/server";

export interface SudokuEnv {
  SUDOKU_GAME: DurableObjectNamespace;
  HARMLESSLY_FAKE_ANNOTATIONS?: string;
  SECRET_PATH?: string;
}

export interface SudokuGameStub {
  initialize(gameId: string, puzzle: PreparedPuzzle, now: number): Promise<RpcResult<GameSnapshot>>;
  getGame(): Promise<RpcResult<GameSnapshot>>;
  playMove(row: number, column: number, value: number): Promise<RpcResult<MoveResponse>>;
  checkGame(): Promise<RpcResult<CheckResponse>>;
  resetGame(now: number): Promise<RpcResult<GameSnapshot>>;
}

export function handleRequest(request: Request, env: SudokuEnv, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const secretPath = (env.SECRET_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");
  const mcpPath = secretPath ? `/${secretPath}/mcp` : "/mcp";
  if (url.pathname === mcpPath || url.pathname === `${mcpPath}/`) {
    return createMcpHandler(() => createServer(env), { route: url.pathname })(request, env, ctx);
  }
  if (url.pathname === "/") {
    return Response.json(secretPath
      ? { name: "sudoku-mcp", status: "ok" }
      : { name: "sudoku-mcp", mcp_endpoint: mcpPath, status: "ok" });
  }
  return new Response("Not found", { status: 404 });
}

const worker: ExportedHandler<SudokuEnv> = { fetch: handleRequest };

export { SudokuGame };
export default worker;
