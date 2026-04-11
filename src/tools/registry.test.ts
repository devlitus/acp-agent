import { test, expect, describe } from "bun:test";
import { ToolRegistry } from "./registry.ts";
import { readFileTool } from "./read-file.ts";
import { writeFileTool } from "./write-file.ts";
import { runCommandTool } from "./run-command.ts";

describe("ToolRegistry", () => {
  test("definitions returns all registered tools", () => {
    const reg = new ToolRegistry()
      .register(readFileTool)
      .register(writeFileTool);

    const names = reg.definitions.map((d) => d.name);
    expect(names).toContain("read_file");
    expect(names).toContain("write_file");
    expect(names).toHaveLength(2);
  });

  test("forAgent() returns only the specified tools", () => {
    const reg = new ToolRegistry()
      .register(readFileTool)
      .register(writeFileTool)
      .register(runCommandTool);

    const filtered = reg.forAgent(["read_file", "write_file"]);
    const names = filtered.definitions.map((d) => d.name);

    expect(names).toContain("read_file");
    expect(names).toContain("write_file");
    expect(names).not.toContain("run_command");
  });

  test("forAgent() silently skips tool names not in the registry", () => {
    const reg = new ToolRegistry().register(readFileTool);
    const filtered = reg.forAgent(["read_file", "nonexistent_tool"]);
    expect(filtered.definitions).toHaveLength(1);
    expect(filtered.definitions[0]?.name).toBe("read_file");
  });

  test("forAgent() with empty list returns empty registry", () => {
    const reg = new ToolRegistry().register(readFileTool);
    const filtered = reg.forAgent([]);
    expect(filtered.definitions).toHaveLength(0);
  });

  test("execute() returns error message for unknown tool", async () => {
    const reg = new ToolRegistry();
    const result = await reg.execute(
      { id: "1", name: "unknown_tool", arguments: {} },
      { sessionId: "s1", connection: {} as never },
    );
    expect(result).toBe("Unknown tool: unknown_tool");
  });

  test("kind() returns 'other' for unknown tool name", () => {
    const reg = new ToolRegistry().register(readFileTool);
    expect(reg.kind("unknown")).toBe("other");
  });
});
