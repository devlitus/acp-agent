import * as acp from "@agentclientprotocol/sdk";
import type { Interface } from "node:readline/promises";

interface TerminalState {
  proc: ReturnType<typeof Bun.spawn>;
  output: string;
  exitCode: number | null;
  completion: Promise<void>;
}

export class ACPClient implements acp.Client {
  private terminals = new Map<string, TerminalState>();

  constructor(private rl: Interface) {}

  async requestPermission(
    params: acp.RequestPermissionRequest,
  ): Promise<acp.RequestPermissionResponse> {
    console.log(`\n🔐 Permission requested: ${params.toolCall.title}`);
    console.log(`\nOptions:`);
    params.options.forEach((option, index) => {
      console.log(`   ${index + 1}. ${option.name} (${option.kind})`);
    });

    while (true) {
      const answer = await this.rl.question("\nChoose an option: ");
      const optionIndex = parseInt(answer.trim()) - 1;
      if (optionIndex >= 0 && optionIndex < params.options.length) {
        return {
          outcome: {
            outcome: "selected",
            optionId: params.options[optionIndex]?.optionId ?? "",
          },
        };
      }
      console.log("Invalid option. Please try again.");
    }
  }

  async sessionUpdate(params: acp.SessionNotification): Promise<void> {
    const update = params.update;

    switch (update.sessionUpdate) {
      case "agent_message_chunk":
        if (update.content.type === "text") {
          process.stdout.write(update.content.text);
        } else {
          process.stdout.write(`[${update.content.type}]`);
        }
        break;
      case "tool_call":
        console.log(`\n🔧 ${update.title} (${update.status})`);
        break;
      case "tool_call_update":
        console.log(`\n🔧 Tool \`${update.toolCallId}\` updated: ${update.status}\n`);
        break;
      default:
        break;
    }
  }

  async writeTextFile(
    params: acp.WriteTextFileRequest,
  ): Promise<acp.WriteTextFileResponse> {
    await Bun.write(params.path, params.content);
    return {};
  }

  async readTextFile(
    params: acp.ReadTextFileRequest,
  ): Promise<acp.ReadTextFileResponse> {
    const content = await Bun.file(params.path).text();
    return { content };
  }

  async createTerminal(
    params: acp.CreateTerminalRequest,
  ): Promise<acp.CreateTerminalResponse> {
    const terminalId = crypto.randomUUID();
    const envVars = Object.fromEntries(
      (params.env ?? []).map((e) => [e.name, e.value]),
    );

    const proc = Bun.spawn([params.command, ...(params.args ?? [])], {
      cwd: params.cwd ?? undefined,
      env: { ...process.env, ...envVars } as Record<string, string>,
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });

    const state: TerminalState = {
      proc,
      output: "",
      exitCode: null,
      completion: Promise.resolve(),
    };

    const readStream = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          state.output += decoder.decode(value, { stream: true });
          if (params.outputByteLimit && state.output.length > params.outputByteLimit) {
            state.output = state.output.slice(-params.outputByteLimit);
          }
        }
      } catch {}
    };

    state.completion = (async () => {
      await Promise.all([
        readStream(proc.stdout as ReadableStream<Uint8Array>),
        readStream(proc.stderr as ReadableStream<Uint8Array>),
      ]);
      state.exitCode = await proc.exited;
    })();

    this.terminals.set(terminalId, state);
    return { terminalId };
  }

  async terminalOutput(
    params: acp.TerminalOutputRequest,
  ): Promise<acp.TerminalOutputResponse> {
    const state = this.terminals.get(params.terminalId);
    if (!state) throw new Error(`Terminal ${params.terminalId} not found`);

    return {
      output: state.output,
      truncated: false,
      exitStatus:
        state.exitCode !== null ? { exitCode: state.exitCode } : undefined,
    };
  }

  async waitForTerminalExit(
    params: acp.WaitForTerminalExitRequest,
  ): Promise<acp.WaitForTerminalExitResponse> {
    const state = this.terminals.get(params.terminalId);
    if (!state) throw new Error(`Terminal ${params.terminalId} not found`);

    await state.completion;
    return { exitCode: state.exitCode };
  }

  async releaseTerminal(
    params: acp.ReleaseTerminalRequest,
  ): Promise<acp.ReleaseTerminalResponse | void> {
    const state = this.terminals.get(params.terminalId);
    if (!state) return;

    if (state.exitCode === null) state.proc.kill();
    this.terminals.delete(params.terminalId);
  }
}
