import { cellsToGrid, gridToCells } from "./normalize";
import { CELL_COUNT, GRID_SIZE, type Grid } from "./types";

const ALL_DIGITS_MASK = 0b1111111110;

function boxIndex(row: number, column: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(column / 3);
}

function bitFor(value: number): number {
  return 1 << value;
}

/** Find up to `limit` solutions, stopping as soon as the limit is reached. */
export function findSolutions(grid: Grid, limit = 2): Grid[] {
  const cells = gridToCells(grid);
  const rowMasks = Array<number>(GRID_SIZE).fill(0);
  const columnMasks = Array<number>(GRID_SIZE).fill(0);
  const boxMasks = Array<number>(GRID_SIZE).fill(0);
  const solutions: Grid[] = [];

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = cells[index];
    if (value === 0) continue;
    const row = Math.floor(index / GRID_SIZE);
    const column = index % GRID_SIZE;
    const box = boxIndex(row, column);
    const bit = bitFor(value);
    if ((rowMasks[row] & bit) !== 0 || (columnMasks[column] & bit) !== 0 || (boxMasks[box] & bit) !== 0) {
      return [];
    }
    rowMasks[row] |= bit;
    columnMasks[column] |= bit;
    boxMasks[box] |= bit;
  }

  function search(): void {
    if (solutions.length >= limit) return;

    let bestIndex = -1;
    let bestMask = 0;
    let bestCount = Number.POSITIVE_INFINITY;

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (cells[index] !== 0) continue;
      const row = Math.floor(index / GRID_SIZE);
      const column = index % GRID_SIZE;
      const mask = ALL_DIGITS_MASK & ~(rowMasks[row] | columnMasks[column] | boxMasks[boxIndex(row, column)]);
      const count = countBits(mask);
      if (count === 0) return;
      if (count < bestCount) {
        bestIndex = index;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }

    if (bestIndex === -1) {
      solutions.push(cellsToGrid(cells));
      return;
    }

    const row = Math.floor(bestIndex / GRID_SIZE);
    const column = bestIndex % GRID_SIZE;
    const box = boxIndex(row, column);
    for (let value = 1; value <= 9; value += 1) {
      const bit = bitFor(value);
      if ((bestMask & bit) === 0) continue;
      cells[bestIndex] = value;
      rowMasks[row] |= bit;
      columnMasks[column] |= bit;
      boxMasks[box] |= bit;
      search();
      rowMasks[row] &= ~bit;
      columnMasks[column] &= ~bit;
      boxMasks[box] &= ~bit;
      cells[bestIndex] = 0;
      if (solutions.length >= limit) return;
    }
  }

  search();
  return solutions;
}

function countBits(mask: number): number {
  let value = mask;
  let count = 0;
  while (value !== 0) {
    value &= value - 1;
    count += 1;
  }
  return count;
}
