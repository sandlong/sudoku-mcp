import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { preparePuzzle } from "../src/game/operations";
import type { SudokuGameStub } from "../src/index";

const PUZZLE = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";

function stub(name: string): SudokuGameStub {
  return env.SUDOKU_GAME.getByName(name) as unknown as SudokuGameStub;
}

describe("SudokuGame Durable Object", () => {
  it("persists the authoritative state across stub lookups", async () => {
    const game = stub("durable-persistence");
    const started = await game.initialize(
      "durable-persistence",
      preparePuzzle(PUZZLE),
      1000
    );
    expect(started.ok).toBe(true);

    const moved = await game.playMove(1, 3, 1);
    expect(moved.ok).toBe(true);

    const reloaded = await stub("durable-persistence").getGame();
    expect(reloaded.ok).toBe(true);
    if (reloaded.ok) {
      expect(reloaded.data.current_grid.slice(0, 3)).toBe("531");
      expect(reloaded.data.initial_grid).toBe(PUZZLE);
    }
  });

  it("isolates game IDs and does not expose the private solution", async () => {
    const first = stub("durable-isolation-a");
    const second = stub("durable-isolation-b");
    const prepared = preparePuzzle(PUZZLE);
    await first.initialize("durable-isolation-a", prepared, 1000);
    await second.initialize("durable-isolation-b", prepared, 1000);
    await first.playMove(1, 3, 1);

    const firstState = await first.getGame();
    const secondState = await second.getGame();
    expect(firstState.ok && firstState.data.current_grid.slice(0, 3)).toBe("531");
    expect(secondState.ok && secondState.data.current_grid.slice(0, 3)).toBe("53.");
    expect(JSON.stringify(firstState)).not.toContain(prepared.solutionGrid);
    expect(JSON.stringify(secondState)).not.toContain(prepared.solutionGrid);
  });

  it("returns the required not-found error for an uninitialized object", async () => {
    const result = await stub("durable-missing").getGame();
    expect(result).toEqual({
      ok: false,
      error: { code: "GAME_NOT_FOUND", message: "game was not found" }
    });
  });
});
