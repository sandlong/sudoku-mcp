import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const PUZZLE = "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79";

async function rpc(method: string, id: number, params: Record<string, unknown> = {}) {
  const response = await SELF.fetch("https://sudoku.test/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });
  const text = await response.text();
  return { response, text };
}

function parseRpc(text: string) {
  const dataLine = text
    .split("\n")
    .find((line) => line.startsWith("data: "));
  return JSON.parse(dataLine ? dataLine.slice("data: ".length) : text) as {
    result?: { tools?: Array<{ name: string }>; structuredContent?: {
      current_grid?: string;
      board?: string;
      game_id?: string;
    } };
  };
}

describe("MCP HTTP surface", () => {
  it("exposes exactly the five gameplay tools", async () => {
    const initialized = await rpc("initialize", 1, {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "vitest", version: "1.0.0" }
    });
    expect(initialized.response.status).toBe(200);

    const listed = await rpc("tools/list", 2);
    expect(listed.response.status).toBe(200);
    const body = parseRpc(listed.text);
    expect(body.result?.tools?.map((tool) => tool.name)).toEqual([
      "start_game",
      "get_game",
      "play_move",
      "check_game",
      "reset_game"
    ]);
  });

  it("starts a game and returns structured canonical state", async () => {
    const result = await rpc("tools/call", 3, {
      name: "start_game",
      arguments: { puzzle: PUZZLE }
    });
    expect(result.response.status).toBe(200);
    const body = parseRpc(result.text);
    expect(body.result?.structuredContent?.current_grid).toBe(PUZZLE);
    expect(body.result?.structuredContent?.board).toContain("C1");
    expect(body.result?.structuredContent?.game_id).toMatch(/^game_[a-f0-9]{32}$/);
  });
});
