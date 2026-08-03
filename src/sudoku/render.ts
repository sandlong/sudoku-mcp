import { GRID_SIZE, type Grid } from "./types";

export function renderBoard(grid: Grid): string {
  const lines = ["      C1 C2 C3  C4 C5 C6  C7 C8 C9"];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const cells = [...grid.slice(row * GRID_SIZE, (row + 1) * GRID_SIZE)];
    const grouped = [cells.slice(0, 3), cells.slice(3, 6), cells.slice(6, 9)]
      .map((group) => group.join("  "))
      .join("   ");
    lines.push(`R${row + 1}    ${grouped}`);
  }
  return lines.join("\n");
}
