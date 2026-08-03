import { DurableObject } from "cloudflare:workers";
import {
  checkGame,
  createGame,
  errorResult,
  playMove,
  resetGame,
  snapshot
} from "../game/operations";
import type {
  CheckResponse,
  GameSnapshot,
  MoveResponse,
  PreparedPuzzle,
  RpcResult,
  StoredGame
} from "../game/types";

interface GameRow extends Record<string, SqlStorageValue> {
  id: number;
  game_id: string;
  version: number;
  initial_grid: string;
  current_grid: string;
  solution_grid: string;
  given_mask: string;
  status: StoredGame["status"];
  created_at: number;
  updated_at: number;
}

/** One SQLite-backed Durable Object owns one logical Sudoku game. */
export class SudokuGame extends DurableObject<unknown, unknown> {
  constructor(ctx: DurableObjectState, _env: unknown) {
    super(ctx, _env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS game_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          game_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          initial_grid TEXT NOT NULL,
          current_grid TEXT NOT NULL,
          solution_grid TEXT NOT NULL,
          given_mask TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `);
    });
  }

  public initialize(
    gameId: string,
    puzzle: PreparedPuzzle,
    now: number
  ): RpcResult<GameSnapshot> {
    const existing = this.readState();
    if (existing) return { ok: true, data: snapshot(existing) };

    const state = createGame(gameId, puzzle, now);
    this.writeState(state);
    return { ok: true, data: snapshot(state) };
  }

  public getGame(): RpcResult<GameSnapshot> {
    const state = this.readState();
    return state
      ? { ok: true, data: snapshot(state) }
      : { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
  }

  public playMove(row: number, column: number, value: number): RpcResult<MoveResponse> {
    const state = this.readState();
    if (!state) return { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };

    const result = playMove(state, row, column, value);
    if (result.ok) this.writeState(state);
    return result;
  }

  public checkGame(): RpcResult<CheckResponse> {
    const state = this.readState();
    return state
      ? { ok: true, data: checkGame(state) }
      : { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
  }

  public resetGame(now: number): RpcResult<GameSnapshot> {
    const state = this.readState();
    if (!state) return { ok: false, error: errorResult("GAME_NOT_FOUND", "game was not found") };
    const result = resetGame(state, now);
    this.writeState(state);
    return { ok: true, data: result };
  }

  private readState(): StoredGame | null {
    const rows = this.ctx.storage.sql
      .exec<GameRow>("SELECT * FROM game_state WHERE id = 1")
      .toArray();
    const row = rows[0];
    if (!row) return null;
    return {
      gameId: row.game_id,
      version: row.version,
      initialGrid: row.initial_grid,
      currentGrid: row.current_grid,
      solutionGrid: row.solution_grid,
      givenMask: row.given_mask,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private writeState(state: StoredGame): void {
    this.ctx.storage.sql.exec(
      `
        INSERT INTO game_state (
          id, game_id, version, initial_grid, current_grid, solution_grid,
          given_mask, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          game_id = excluded.game_id,
          version = excluded.version,
          initial_grid = excluded.initial_grid,
          current_grid = excluded.current_grid,
          solution_grid = excluded.solution_grid,
          given_mask = excluded.given_mask,
          status = excluded.status,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `,
      1,
      state.gameId,
      state.version,
      state.initialGrid,
      state.currentGrid,
      state.solutionGrid,
      state.givenMask,
      state.status,
      state.createdAt,
      state.updatedAt
    );
  }
}
