import { ToolRegistry } from "./registry.ts";
import { readFileTool } from "./read-file.ts";
import { writeFileTool } from "./write-file.ts";
import { runCommandTool } from "./run-command.ts";
import { listDirectoryTool } from "./list-directory.ts";
import { searchFilesTool } from "./search-files.ts";
import { saveMemoryTool } from "./save-memory.ts";
import { recallMemoryTool } from "./recall-memory.ts";
import { webSearchTool } from "./web-search.ts";
import { fetchUrlTool } from "./fetch-url.ts";

export const registry = new ToolRegistry()
  .register(readFileTool)
  .register(writeFileTool)
  .register(runCommandTool)
  .register(listDirectoryTool)
  .register(searchFilesTool)
  .register(saveMemoryTool)
  .register(recallMemoryTool)
  .register(webSearchTool)
  .register(fetchUrlTool);
