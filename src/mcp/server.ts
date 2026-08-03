import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  errorResult,
  preparePuzzle,
  puzzleErrorResult
} from "../game/operations";
import type {
  CheckResponse,
  GameSnapshot,
  MoveResponse,
  RpcResult
} from "../game/types";
import type { SudokuGameStub, SudokuEnv } from "../index";

type ToolPayload = Record<string, unknown>;

function gameStub(env: SudokuEnv, gameId: string): SudokuGameStub {
  return env.SUDOKU_GAME.getByName(gameId) as unknown as SudokuGameStub;
}

function gameId(): string {
  return `game_${crypto.randomUUID().replaceAll("-", "")}`;
}

function boardFromPayload(payload: ToolPayload): string | undefined {
  if (typeof payload.board === "string") return payload.board;
  const error = payload.error;
  if (typeof error !== "object" || error === null) return undefined;
  const state = (error as { details?: { state?: unknown } }).details?.state;
  if (typeof state !== "object" || state === null) return undefined;
  return typeof (state as { board?: unknown }).board === "string"
    ? (state as { board: string }).board
    : undefined;
}

async function safeCall<T>(operation: () => Promise<RpcResult<T>>): Promise<RpcResult<T>> {
  try {
    return await operation();
  } catch {
    return {
      ok: false,
      error: errorResult("INTERNAL_ERROR", "an unexpected server error occurred")
    };
  }
}

function toolResponse<T extends object>(summary: string, result: RpcResult<T>) {
  let payload: ToolPayload;
  if (result.ok) {
    payload = result.data as ToolPayload;
  } else {
    const state = result.error.details?.state;
    payload = typeof state === "object" && state !== null && !Array.isArray(state)
      ? { ...(state as ToolPayload), error: result.error }
      : { error: result.error };
  }
  const board = boardFromPayload(payload);
  const text = board === undefined
    ? `${summary}\n${JSON.stringify(payload)}`
    : `${summary}\n\n${board}`;

  return {
    content: [{ type: "text" as const, text }],
    structuredContent: payload,
    ...(result.ok ? {} : { isError: true as const })
  };
}

function startErrorResponse(error: unknown) {
  return toolResponse(
    "Could not start the game.",
    { ok: false, error: puzzleErrorResult(error) }
  );
}

export function createServer(env: SudokuEnv): McpServer {
  const server = new McpServer({
    name: "sudoku-mcp",
    version: "0.1.0"
  });

  server.registerTool(
    "start_game",
    {
      description:
        "Start a Sudoku game from an 81-cell row-major puzzle. Digits 1-9 are givens; . and 0 are empty. The puzzle must have exactly one solution.",
      inputSchema: {
        puzzle: z.string().describe("81-cell row-major grid; whitespace is ignored; 0 means empty")
      }
    },
    async ({ puzzle }) => {
      let prepared;
      try {
        prepared = preparePuzzle(puzzle);
      } catch (error) {
        return startErrorResponse(error);
      }

      const id = gameId();
      const result = await safeCall(() => gameStub(env, id).initialize(id, prepared, Date.now()));
      return toolResponse("Game started.", result);
    }
  );

  server.registerTool(
    "get_game",
    {
      description: "Get the authoritative current state of a Sudoku game by its opaque game ID.",
      inputSchema: {
        game_id: z.string().min(1).max(128).describe("Opaque game ID returned by start_game")
      }
    },
    async ({ game_id }) => toolResponse("Current game state.", await safeCall(() => gameStub(env, game_id).getGame()))
  );

  server.registerTool(
    "play_move",
    {
      description:
        "Enter or erase one cell. Rows and columns are 1-based. value 0 erases. This only checks visible row/column/box conflicts against the current board; it does not judge the hidden solution. Use check_game for correctness.",
      inputSchema: {
        game_id: z.string().min(1).max(128),
        row: z.number().int().describe("1-based row from 1 through 9"),
        column: z.number().int().describe("1-based column from 1 through 9"),
        value: z.number().int().describe("1-9 to enter, 0 to erase")
      }
    },
    async ({ game_id, row, column, value }) =>
      toolResponse("Move result.", await safeCall(() => gameStub(env, game_id).playMove(row, column, value)))
  );

  server.registerTool(
    "check_game",
    {
      description:
        "Check entered mutable cells against the private solution. Returns correct_so_far, incorrect, or solved, and lists wrong cells without revealing correct values.",
      inputSchema: {
        game_id: z.string().min(1).max(128).describe("Opaque game ID returned by start_game")
      }
    },
    async ({ game_id }) => toolResponse("Correctness check.", await safeCall(() => gameStub(env, game_id).checkGame()))
  );

  server.registerTool(
    "reset_game",
    {
      description: "Reset a Sudoku game to its original givens while preserving its game ID and private solution.",
      inputSchema: {
        game_id: z.string().min(1).max(128).describe("Opaque game ID returned by start_game")
      }
    },
    async ({ game_id }) => toolResponse("Game reset.", await safeCall(() => gameStub(env, game_id).resetGame(Date.now())))
  );

  return server;
}

export type SupportedToolResponse = GameSnapshot | MoveResponse | CheckResponse;
