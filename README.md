# ACP Agent

Agent Client Protocol (ACP) implementation with TypeScript and Bun.

## Installation

```bash
bun install
```

## Usage

### Run the Agent

```bash
bun run agent
```

or

```bash
bun run src/agent.ts
```

The agent will start and wait for ACP protocol messages over stdio.

### Run the CLI Client

```bash
bun run client
```

or

```bash
bun run src/client.ts
```

This will spawn the agent as a subprocess and send a test prompt, demonstrating:
- Agent initialization and session creation
- Agent message chunks
- Tool calls (file reading, editing)
- Permission requests for sensitive operations
- User interaction via CLI

**Note**: When the agent requests permission, you'll need to enter a number to select an option.

### Use with Zed Editor

Add to your Zed settings:

```json
{
  "agent_servers": {
    "ACP Agent": {
      "command": "bun",
      "args": ["run", "/path/to/acp-agent/src/agent.ts"]
    }
  }
}
```

## Project Structure

- `src/agent.ts` - ACP Agent implementation
- `src/client.ts` - CLI client for testing the agent
- `index.ts` - Entry point (minimal)

## Resources

- [ACP TypeScript SDK](https://agentclientprotocol.com/libraries/typescript)
- [ACP Examples](https://github.com/agentclientprotocol/typescript-sdk/tree/main/src/examples)
