import {
  createGame,
  errorResult,
  playMove,
  preparePuzzle,
  puzzleErrorResult,
  resetGame,
  snapshot,
  checkGame
} from "./operations";
import type { CheckResponse, GameSnapshot, MoveResponse, RpcResult, StoredGame } from "./types";

/** Small in-memory implementation used by unit tests and local domain consumers. */
export class InMemoryGameManager {
  private readonly games = new Map<string, StoredGame>();

  start(gameId: string, puzzle: string, now = Date.now()): RpcResult<GameSnapshot> {
    try {
      const prepared = preparePuzzle(puzzle);
      const state = createGame(gameId, prepared, now);
      this.games.set(gameId, state);
      return { ok: true, data: snapshot(state) };
    } catch (error) {
      return { ok: false, error: puzzleErrorResult(error) };
    }
  }

  get(gameId: string): RpcResult<GameSnapshot> {
    const state = this.games.get(gameId);
    return state
      ? { ok: true, data: snapshot(state) }
      : { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
  }

  move(gameId: string, row: number, column: number, value: number): RpcResult<MoveResponse> {
    const state = this.games.get(gameId);
    if (!state) return { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
    return playMove(state, row, column, value);
  }

  check(gameId: string): RpcResult<CheckResponse> {
    const state = this.games.get(gameId);
    return state
      ? { ok: true, data: checkGame(state) }
      : { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
  }

  reset(gameId: string, now = Date.now()): RpcResult<GameSnapshot> {
    const state = this.games.get(gameId);
    return state
      ? { ok: true, data: resetGame(state, now) }
      : { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
  }
}
