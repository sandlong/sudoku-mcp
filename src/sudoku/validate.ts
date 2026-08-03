import { gridToCells } from "./normalize";
import { GRID_SIZE, type Grid } from "./types";

export class ContradictoryGivensError extends Error {
  constructor(message = "puzzle givens contradict Sudoku rules") {
    super(message);
    this.name = "ContradictoryGivensError";
  }
}

function duplicateInUnit(cells: readonly number[]): boolean {
  const seen = new Set<number>();
  for (const value of cells) {
    if (value === 0) continue;
    if (seen.has(value)) return true;
    seen.add(value);
  }
  return false;
}

export function validateGivens(grid: Grid): void {
  const cells = gridToCells(grid);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (duplicateInUnit(cells.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE))) {
      throw new ContradictoryGivensError(`duplicate given in row ${row + 1}`);
    }
  }

  for (let column = 0; column < GRID_SIZE; column += 1) {
    const unit = Array.from({ length: GRID_SIZE }, (_, row) => cells[row * GRID_SIZE + column]);
    if (duplicateInUnit(unit)) {
      throw new ContradictoryGivensError(`duplicate given in column ${column + 1}`);
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      const unit: number[] = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let column = boxColumn * 3; column < boxColumn * 3 + 3; column += 1) {
          unit.push(cells[row * GRID_SIZE + column]);
        }
      }
      if (duplicateInUnit(unit)) {
        throw new ContradictoryGivensError(
          `duplicate given in box ${boxRow * 3 + boxColumn + 1}`
        );
      }
    }
  }
}

export function isValidCompletedGrid(grid: Grid): boolean {
  try {
    validateGivens(grid);
  } catch {
    return false;
  }
  return !grid.includes(".") && [...grid].every((cell) => cell >= "1" && cell <= "9");
}
