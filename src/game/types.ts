import type { GivenMask, Grid, VisibleConflict, WrongCell } from "../sudoku/types";

export type GameStatus = "in_progress" | "solved";
export type CheckStatus = "correct_so_far" | "incorrect" | "solved";

export type ErrorCode =
  | "INVALID_FORMAT"
  | "INVALID_LENGTH"
  | "CONTRADICTORY_GIVENS"
  | "NO_SOLUTION"
  | "MULTIPLE_SOLUTIONS"
  | "GAME_NOT_FOUND"
  | "GAME_EXPIRED"
  | "INVALID_ROW"
  | "INVALID_COLUMN"
  | "INVALID_VALUE"
  | "GIVEN_CELL"
  | "VISIBLE_CONFLICT"
  | "INTERNAL_ERROR";

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface GameSnapshot {
  game_id: string;
  version: number;
  initial_grid: Grid;
  current_grid: Grid;
  status: GameStatus;
  filled_cells: number;
  empty_cells: number;
  board: string;
  created_at: number;
  updated_at: number;
}

export interface MoveInfo {
  operation: "enter" | "erase";
  row: number;
  column: number;
  value: number;
}

export interface MoveResponse extends GameSnapshot {
  accepted: boolean;
  move?: MoveInfo;
  unchanged?: boolean;
  error?: ApiError;
  conflicts?: VisibleConflict[];
}

export interface CheckResponse extends GameSnapshot {
  check: {
    status: CheckStatus;
    filled_cells: number;
    empty_cells: number;
    wrong_cells: WrongCell[];
  };
}

export interface StoredGame {
  gameId: string;
  version: number;
  initialGrid: Grid;
  currentGrid: Grid;
  solutionGrid: Grid;
  givenMask: GivenMask;
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
}

export interface PreparedPuzzle {
  initialGrid: Grid;
  solutionGrid: Grid;
  givenMask: GivenMask;
}

export interface RpcSuccess<T> {
  ok: true;
  data: T;
}

export interface RpcFailure {
  ok: false;
  error: ApiError;
}

export type RpcResult<T> = RpcSuccess<T> | RpcFailure;
