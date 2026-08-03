import {
  cellNameFor,
  findSolutions,
  findVisibleConflicts,
  givenMaskFor,
  isComplete,
  isGiven,
  normalizeGrid,
  renderBoard,
  validateGivens,
  type GridInputError
} from "../sudoku/index";
import { countFilled } from "../sudoku/normalize";
import type {
  ApiError,
  CheckResponse,
  ErrorCode,
  GameSnapshot,
  MoveResponse,
  PreparedPuzzle,
  RpcResult,
  StoredGame
} from "./types";

export class PuzzleError extends Error {
  readonly code: Extract<ErrorCode, "INVALID_FORMAT" | "INVALID_LENGTH" | "CONTRADICTORY_GIVENS" | "NO_SOLUTION" | "MULTIPLE_SOLUTIONS">;

  constructor(
    code: PuzzleError["code"],
    message: string
  ) {
    super(message);
    this.name = "PuzzleError";
    this.code = code;
  }
}

export function preparePuzzle(input: string): PreparedPuzzle {
  let initialGrid: string;
  try {
    initialGrid = normalizeGrid(input);
  } catch (error) {
    const inputError = error as GridInputError;
    throw new PuzzleError(inputError.code, inputError.message);
  }

  try {
    validateGivens(initialGrid);
  } catch (error) {
    throw new PuzzleError("CONTRADICTORY_GIVENS", (error as Error).message);
  }

  const solutions = findSolutions(initialGrid, 2);
  if (solutions.length === 0) {
    throw new PuzzleError("NO_SOLUTION", "puzzle has no valid solution");
  }
  if (solutions.length > 1) {
    throw new PuzzleError("MULTIPLE_SOLUTIONS", "puzzle must have exactly one solution");
  }

  return {
    initialGrid,
    solutionGrid: solutions[0],
    givenMask: givenMaskFor(initialGrid)
  };
}

export function createGame(
  gameId: string,
  puzzle: PreparedPuzzle,
  now: number
): StoredGame {
  return {
    gameId,
    version: 1,
    initialGrid: puzzle.initialGrid,
    currentGrid: puzzle.initialGrid,
    solutionGrid: puzzle.solutionGrid,
    givenMask: puzzle.givenMask,
    status: "in_progress",
    createdAt: now,
    updatedAt: now
  };
}

export function snapshot(state: StoredGame): GameSnapshot {
  const filledCells = countFilled(state.currentGrid);
  return {
    game_id: state.gameId,
    version: state.version,
    initial_grid: state.initialGrid,
    current_grid: state.currentGrid,
    status: state.status,
    filled_cells: filledCells,
    empty_cells: 81 - filledCells,
    board: renderBoard(state.currentGrid),
    created_at: state.createdAt,
    updated_at: state.updatedAt
  };
}

export function errorResult(code: ErrorCode, message: string, details?: Record<string, unknown>): ApiError {
  return details === undefined ? { code, message } : { code, message, details };
}

function stateError<T>(state: StoredGame, error: ApiError): RpcResult<T> {
  return {
    ok: false,
    error: {
      ...error,
      details: {
        ...(error.details ?? {}),
        state: snapshot(state)
      }
    }
  };
}

function validCoordinate(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

export function playMove(state: StoredGame, row: number, column: number, value: number): RpcResult<MoveResponse> {
  if (!validCoordinate(row)) {
    return stateError(state, errorResult("INVALID_ROW", "row must be an integer from 1 through 9"));
  }
  if (!validCoordinate(column)) {
    return stateError(state, errorResult("INVALID_COLUMN", "column must be an integer from 1 through 9"));
  }
  if (!Number.isInteger(value) || value < 0 || value > 9) {
    return stateError(state, errorResult("INVALID_VALUE", "value must be an integer from 0 through 9"));
  }

  const zeroRow = row - 1;
  const zeroColumn = column - 1;
  const index = zeroRow * 9 + zeroColumn;
  if (isGiven(state.givenMask, index)) {
    return stateError(state, errorResult("GIVEN_CELL", `${cellNameFor(zeroRow, zeroColumn)} is an immutable given`));
  }

  if (value > 0) {
    const conflicts = findVisibleConflicts(state.currentGrid, zeroRow, zeroColumn, value);
    if (conflicts.length > 0) {
      return {
        ok: false,
        error: errorResult("VISIBLE_CONFLICT", `${cellNameFor(zeroRow, zeroColumn)} conflicts with the current board`, {
          conflicts,
          state: snapshot(state)
        })
      };
    }
  }

  const cells = [...state.currentGrid];
  const previous = cells[index];
  const next = value === 0 ? "." : String(value);
  cells[index] = next;
  state.currentGrid = cells.join("");
  if (previous !== next) {
    state.status = isComplete(state.currentGrid) ? "solved" : "in_progress";
    state.version += 1;
    state.updatedAt = Date.now();
  }

  const response: MoveResponse = {
    ...snapshot(state),
    accepted: true,
    move: {
      operation: value === 0 ? "erase" : "enter",
      row,
      column,
      value
    }
  };
  if (previous === next) response.unchanged = true;
  return { ok: true, data: response };
}

export function checkGame(state: StoredGame): CheckResponse {
  const wrongCells = [];
  for (let index = 0; index < 81; index += 1) {
    if (state.givenMask[index] === "1" || state.currentGrid[index] === ".") continue;
    if (state.currentGrid[index] !== state.solutionGrid[index]) {
      const row = Math.floor(index / 9);
      const column = index % 9;
      wrongCells.push({
        cell: cellNameFor(row, column),
        row: row + 1,
        column: column + 1,
        entered: Number(state.currentGrid[index])
      });
    }
  }

  const filledCells = countFilled(state.currentGrid);
  const checkStatus = wrongCells.length > 0
    ? "incorrect"
    : isComplete(state.currentGrid)
      ? "solved"
      : "correct_so_far";

  return {
    ...snapshot(state),
    check: {
      status: checkStatus,
      filled_cells: filledCells,
      empty_cells: 81 - filledCells,
      wrong_cells: wrongCells
    }
  };
}

export function resetGame(state: StoredGame, now = Date.now()): GameSnapshot {
  state.currentGrid = state.initialGrid;
  state.status = "in_progress";
  state.version += 1;
  state.updatedAt = now;
  return snapshot(state);
}

export function puzzleErrorResult(error: unknown): ApiError {
  if (error instanceof PuzzleError) return errorResult(error.code, error.message);
  return errorResult("INTERNAL_ERROR", "an unexpected error occurred");
}
