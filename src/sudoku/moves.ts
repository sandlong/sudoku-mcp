import { countFilled, gridToCells, isGiven } from "./normalize";
import { GRID_SIZE, type GivenMask, type Grid, type VisibleConflict } from "./types";

function cellName(row: number, column: number): string {
  return `r${row + 1}c${column + 1}`;
}

function boxFor(row: number, column: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(column / 3);
}

export function findVisibleConflicts(
  grid: Grid,
  row: number,
  column: number,
  value: number
): VisibleConflict[] {
  if (value === 0) return [];
  const cells = gridToCells(grid);
  const targetBox = boxFor(row, column);
  const conflicts = new Map<number, VisibleConflict>();

  for (let index = 0; index < cells.length; index += 1) {
    if (index === row * GRID_SIZE + column || cells[index] !== value) continue;
    const otherRow = Math.floor(index / GRID_SIZE);
    const otherColumn = index % GRID_SIZE;
    const types: VisibleConflict["types"] = [];
    if (otherRow === row) types.push("row");
    if (otherColumn === column) types.push("column");
    if (boxFor(otherRow, otherColumn) === targetBox) types.push("box");
    if (types.length > 0) {
      conflicts.set(index, {
        row: otherRow + 1,
        column: otherColumn + 1,
        cell: cellName(otherRow, otherColumn),
        value,
        types
      });
    }
  }

  return [...conflicts.values()];
}

export function isComplete(grid: Grid): boolean {
  return countFilled(grid) === GRID_SIZE * GRID_SIZE;
}

export function isValidMoveValue(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

export function cellNameFor(row: number, column: number): string {
  return cellName(row, column);
}

export function canEdit(givenMask: GivenMask, row: number, column: number): boolean {
  return !isGiven(givenMask, row * GRID_SIZE + column);
}
