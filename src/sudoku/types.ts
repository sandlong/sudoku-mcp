export const GRID_SIZE = 9;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

export type Grid = string;
export type GivenMask = string;
export type ConflictType = "row" | "column" | "box";

export interface CellPosition {
  row: number;
  column: number;
}

export interface VisibleConflict extends CellPosition {
  cell: string;
  value: number;
  types: ConflictType[];
}

export interface WrongCell extends CellPosition {
  cell: string;
  entered: number;
}
