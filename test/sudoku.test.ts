import { describe, expect, it } from "vitest";
import {
  findSolutions,
  normalizeGrid,
  validateGivens
} from "../src/sudoku/index";
import {
  checkGame,
  preparePuzzle
} from "../src/game/operations";
import { InMemoryGameManager } from "../src/game/service";

const PUZZLE = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";
const SOLUTION = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const NO_SOLUTION = "531.7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";

function unwrap<T>(result: { ok: boolean; data?: T; error?: unknown }): T {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.data as T;
}

describe("Sudoku engine", () => {
  it("normalizes whitespace and zeroes to the canonical grid", () => {
    const spaced = PUZZLE.match(/.{1,9}/g)?.join("\n") ?? PUZZLE;
    expect(normalizeGrid(spaced.replaceAll(".", "0"))).toBe(PUZZLE);
  });

  it("rejects invalid length and characters", () => {
    expect(() => normalizeGrid(".".repeat(80))).toThrow(/exactly 81/);
    expect(() => normalizeGrid(`${".".repeat(80)}x`)).toThrow(/only digits/);
  });

  it("detects contradictory givens before solving", () => {
    expect(() => preparePuzzle(`11${".".repeat(79)}`)).toThrow(/duplicate given/);
    expect(() => validateGivens(`1${".".repeat(80)}`)).not.toThrow();
  });

  it("requires one solution and keeps the solver bounded at two", () => {
    expect(findSolutions(PUZZLE, 2)).toEqual([SOLUTION]);
    expect(() => preparePuzzle(".".repeat(81))).toThrow(/exactly one solution/);
    expect(() => preparePuzzle(NO_SOLUTION)).toThrow(/no valid solution/);
  });
});

describe("game rules", () => {
  it("accepts locally legal entries even when they are wrong", () => {
    const manager = new InMemoryGameManager();
    const started = manager.start("game-wrong", PUZZLE);
    const state = unwrap(started);

    const move = manager.move("game-wrong", 1, 3, 1);
    expect(move.ok).toBe(true);
    expect(unwrap(move).current_grid).toBe(`${PUZZLE.slice(0, 2)}1${PUZZLE.slice(3)}`);

    const checked = unwrap(manager.check("game-wrong"));
    expect(checked.check.status).toBe("incorrect");
    expect(checked.check.wrong_cells).toEqual([
      { cell: "r1c3", row: 1, column: 3, entered: 1 }
    ]);
    expect(JSON.stringify(state)).not.toContain(SOLUTION);
  });

  it("rejects given cells and visible conflicts without changing state", () => {
    const manager = new InMemoryGameManager();
    manager.start("game-rules", PUZZLE);
    const before = unwrap(manager.get("game-rules"));

    const given = manager.move("game-rules", 1, 1, 0);
    expect(given.ok).toBe(false);
    if (given.ok) throw new Error("given-cell move unexpectedly succeeded");
    expect(given.error).toMatchObject({ code: "GIVEN_CELL" });

    const conflict = manager.move("game-rules", 1, 3, 5);
    expect(conflict.ok).toBe(false);
    if (conflict.ok) throw new Error("conflicting move unexpectedly succeeded");
    expect(conflict.error).toMatchObject({ code: "VISIBLE_CONFLICT" });
    expect("details" in conflict.error).toBe(true);
    expect(unwrap(manager.get("game-rules"))).toEqual(before);
  });

  it("supports idempotent erasure, reset, and solving", () => {
    const manager = new InMemoryGameManager();
    manager.start("game-lifecycle", PUZZLE);

    const eraseEmpty = manager.move("game-lifecycle", 1, 3, 0);
    expect(eraseEmpty.ok).toBe(true);
    expect(unwrap(eraseEmpty).unchanged).toBe(true);

    for (let index = 0; index < 81; index += 1) {
      if (PUZZLE[index] !== ".") continue;
      const row = Math.floor(index / 9) + 1;
      const column = index % 9 + 1;
      const move = manager.move("game-lifecycle", row, column, Number(SOLUTION[index]));
      expect(move.ok).toBe(true);
    }

    const solved = unwrap(manager.get("game-lifecycle"));
    expect(solved.status).toBe("solved");
    expect(solved.current_grid).toBe(SOLUTION);
    expect(unwrap(manager.check("game-lifecycle")).check.status).toBe("solved");

    const reset = unwrap(manager.reset("game-lifecycle"));
    expect(reset.current_grid).toBe(PUZZLE);
    expect(reset.status).toBe("in_progress");
  });
});

describe("correctness reporting", () => {
  it("never reports givens as wrong cells", () => {
    const manager = new InMemoryGameManager();
    manager.start("game-check", PUZZLE);
    manager.move("game-check", 1, 3, 1);
    const result = unwrap(manager.check("game-check"));
    expect(result.check.wrong_cells.every((cell) => PUZZLE[(cell.row - 1) * 9 + cell.column - 1] === ".")).toBe(true);
    expect(checkGame).toBeTypeOf("function");
  });
});
