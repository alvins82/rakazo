import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { describe, expect, it } from "vitest";
import { PiJsonlSessionRecorder } from "./pi-session.js";

async function readFiles(root: string): Promise<string> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(root, entry.name);
      return entry.isDirectory() ? readFiles(target) : readFile(target, "utf8");
    }),
  );
  return contents.join("\n");
}

describe("Pi JSONL sessions", () => {
  it("uses Pi's session format for context and completed messages", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "rakazo-pi-session-"));
    try {
      const recorder = new PiJsonlSessionRecorder(path.join(root, "sessions"), root);
      const session = await recorder.start({
        runId: "run-1",
        threadId: "thread-1",
        botId: "bot-1",
        traceId: "trace-1",
        provider: "openai-compatible",
        model: "qwen-test",
        thinkingLevel: "medium",
        systemPrompt: "Be concise.",
        initialMessages: [{ role: "user", content: "prior", timestamp: 1 }],
      });
      await session.appendMessage({
        role: "assistant",
        content: [
          { type: "thinking", thinking: "I should answer." },
          { type: "text", text: "done" },
        ],
        api: "openai-completions",
        provider: "openai-compatible",
        model: "qwen-test",
        usage: {
          input: 1,
          output: 1,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 2,
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
        },
        stopReason: "stop",
        rawStopReason: "eos",
        timestamp: 2,
      } satisfies AgentMessage);

      const raw = await readFiles(path.join(root, "sessions"));
      expect(raw).toContain("rakazo_context");
      expect(raw).toContain("Be concise.");
      expect(raw).toContain("prior");
      expect(raw).toContain("I should answer.");
      expect(raw).toContain("rawStopReason");
      expect(raw).toContain("eos");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
