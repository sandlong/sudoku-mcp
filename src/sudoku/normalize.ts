import { CELL_COUNT, type GivenMask, type Grid } from "./types";

export type InputErrorCode = "INVALID_FORMAT" | "INVALID_LENGTH";

export class GridInputError extends Error {
  readonly code: InputErrorCode;

  constructor(code: InputErrorCode, message: string) {
    super(message);
    this.name = "GridInputError";
    this.code = code;
  }
}

/** Normalize a user puzzle to the canonical 81-character row-major form. */
export function normalizeGrid(input: unknown): Grid {
  if (typeof input !== "string") {
    throw new GridInputError("INVALID_FORMAT", "puzzle must be a string");
  }

  const compact = input.replace(/\s/g, "");
  if (compact.length !== CELL_COUNT) {
    throw new GridInputError(
      "INVALID_LENGTH",
      `puzzle must contain exactly ${CELL_COUNT} cells after whitespace is removed`
    );
  }

  if (!/^[0-9.]+$/.test(compact)) {
    throw new GridInputError(
      "INVALID_FORMAT",
      "puzzle may contain only digits 1-9, 0, and ."
    );
  }

  return compact.replaceAll("0", ".");
}

export function gridToCells(grid: Grid): number[] {
  return [...grid].map((cell) => (cell === "." ? 0 : Number(cell)));
}

export function cellsToGrid(cells: readonly number[]): Grid {
  if (cells.length !== CELL_COUNT) {
    throw new GridInputError("INVALID_LENGTH", "internal grid must contain 81 cells");
  }
  return cells.map((cell) => (cell === 0 ? "." : String(cell))).join("");
}

export function givenMaskFor(grid: Grid): GivenMask {
  return [...grid].map((cell) => (cell === "." ? "0" : "1")).join("");
}

export function isGiven(givenMask: GivenMask, index: number): boolean {
  return givenMask[index] === "1";
}

export function countFilled(grid: Grid): number {
  return [...grid].filter((cell) => cell !== ".").length;
}
