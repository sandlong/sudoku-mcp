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
}

export interface SudokuGameStub {
  initialize(gameId: string, puzzle: PreparedPuzzle, now: number): Promise<RpcResult<GameSnapshot>>;
  getGame(): Promise<RpcResult<GameSnapshot>>;
  playMove(row: number, column: number, value: number): Promise<RpcResult<MoveResponse>>;
  checkGame(): Promise<RpcResult<CheckResponse>>;
  resetGame(now: number): Promise<RpcResult<GameSnapshot>>;
}

const worker: ExportedHandler<SudokuEnv> = {
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      return createMcpHandler(() => createServer(env))(request, env, ctx);
    }
    if (url.pathname === "/") {
      return Response.json({ name: "sudoku-mcp", mcp_endpoint: "/mcp", status: "ok" });
    }
    return new Response("Not found", { status: 404 });
  }
};

export { SudokuGame };
export default worker;
