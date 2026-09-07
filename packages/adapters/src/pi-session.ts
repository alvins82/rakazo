import path from "node:path";
import { type AgentMessage, JsonlSessionRepo, type Session } from "@earendil-works/pi-agent-core";
import { NodeExecutionEnv } from "@earendil-works/pi-agent-core/node";
import { getLogger } from "@rakazo/logging";

export interface PiSessionStart {
  runId: string;
  threadId: string;
  botId: string;
  traceId?: string;
  provider: string;
  model: string;
  thinkingLevel: string;
  systemPrompt: string;
  initialMessages: readonly AgentMessage[];
}

export interface PiSessionHandle {
  appendMessage(message: AgentMessage): Promise<void>;
}

export interface PiSessionRecorder {
  start(input: PiSessionStart): Promise<PiSessionHandle>;
}

/**
 * Persists the low-level Agent transcript using Pi's native JSONL session format.
 * This is deliberately a recorder only: Rakazo remains responsible for running
 * the agent and for its product history in Postgres.
 */
export class PiJsonlSessionRecorder implements PiSessionRecorder {
  private readonly cwd: string;
  private readonly repo: JsonlSessionRepo;

  constructor(sessionsRoot: string, cwd = process.cwd()) {
    this.cwd = path.resolve(cwd);
    const fs = new NodeExecutionEnv({ cwd: this.cwd });
    this.repo = new JsonlSessionRepo({
      fs,
      sessionsRoot: path.resolve(sessionsRoot),
    });
  }

  async start(input: PiSessionStart): Promise<PiSessionHandle> {
    const session = await this.repo.create({
      id: input.runId,
      cwd: this.cwd,
      metadata: {
        rakazoBotId: input.botId,
        rakazoRunId: input.runId,
        rakazoThreadId: input.threadId,
        ...(input.traceId ? { rakazoTraceId: input.traceId } : {}),
        model: input.model,
        provider: input.provider,
      },
    });
    const handle = new BestEffortPiSession(session, input.runId);

    await handle.appendCustomEntry("rakazo_context", {
      model: input.model,
      provider: input.provider,
      thinkingLevel: input.thinkingLevel,
      systemPrompt: input.systemPrompt,
    });
    for (const message of input.initialMessages) {
      await handle.appendMessage(message);
    }

    return handle;
  }
}

class BestEffortPiSession implements PiSessionHandle {
  private failureLogged = false;

  constructor(
    private readonly session: Session,
    private readonly runId: string,
  ) {}

  async appendMessage(message: AgentMessage): Promise<void> {
    try {
      await this.session.appendMessage(message);
    } catch (error) {
      this.logFailure("message", error);
    }
  }

  async appendCustomEntry(customType: string, data: Record<string, string>): Promise<void> {
    try {
      await this.session.appendCustomEntry(customType, data);
    } catch (error) {
      this.logFailure("context", error);
    }
  }

  private logFailure(kind: string, error: unknown): void {
    if (this.failureLogged) return;
    this.failureLogged = true;
    getLogger().warn("Pi session recording failed", {
      kind,
      runId: this.runId,
      error,
    });
  }
}
