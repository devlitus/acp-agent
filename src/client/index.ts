import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Writable, Readable } from "node:stream";
import readline from "node:readline/promises";

import * as acp from "@agentclientprotocol/sdk";
import { ACPClient } from "./client.ts";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const agentPath = join(__dirname, "../agent/index.ts");

  const agentProcess = spawn("bun", ["run", agentPath], {
    stdio: ["pipe", "pipe", "inherit"],
  });

  const input = Writable.toWeb(agentProcess.stdin!);
  const output = Readable.toWeb(agentProcess.stdout!) as ReadableStream<Uint8Array>;

  const client = new ACPClient(rl);
  const stream = acp.ndJsonStream(input, output);
  const connection = new acp.ClientSideConnection((_agent) => client, stream);

  const initResult = await connection.initialize({
    protocolVersion: acp.PROTOCOL_VERSION,
    clientCapabilities: {
      fs: { readTextFile: true, writeTextFile: true },
      terminal: true,
    },
  });

  console.log(`✅ Connected to agent (protocol v${initResult.protocolVersion})`);

  const sessionResult = await connection.newSession({
    cwd: process.cwd(),
    mcpServers: [],
  });

  console.log(`📝 Session: ${sessionResult.sessionId}`);
  console.log(`Type "exit" to quit.\n`);

  rl.on("close", () => {
    agentProcess.kill();
    process.exit(0);
  });

  while (true) {
    const userInput = await rl.question("You: ");
    const trimmed = userInput.trim();

    if (trimmed === "exit" || trimmed === "quit") break;
    if (!trimmed) continue;

    process.stdout.write("\nAgent: ");

    const promptResult = await connection.prompt({
      sessionId: sessionResult.sessionId,
      prompt: [{ type: "text", text: trimmed }],
    });

    console.log(`\n\n[${promptResult.stopReason}]\n`);
  }

  rl.close();
  agentProcess.kill();
  process.exit(0);
}

main().catch(console.error);
