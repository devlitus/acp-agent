import { describe, expect, it } from "bun:test";
import { ToolRegistry } from "../src/tools/registry.ts";
import { readFileTool } from "../src/tools/read-file.ts";
import { writeFileTool } from "../src/tools/write-file.ts";

describe("ToolRegistry", () => {
  it("forAgent() returns only the specified subset", () => {
    const registry = new ToolRegistry();
    registry.register(readFileTool);
    registry.register(writeFileTool);

    const filtered = registry.forAgent(["read_file"]);
    expect(filtered.definitions).toHaveLength(1);
    expect(filtered.definitions[0]?.name).toBe("read_file");

    const allFiltered = registry.forAgent(["read_file", "write_file"]);
    expect(allFiltered.definitions).toHaveLength(2);
    expect(allFiltered.definitions.map((d) => d.name)).toEqual(["read_file", "write_file"]);
  });
});
