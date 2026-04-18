import type * as acp from "@agentclientprotocol/sdk";

export interface AgentConnection {
  sessionUpdate(params: acp.SessionNotification): Promise<void>;
  requestPermission(params: acp.RequestPermissionRequest): Promise<acp.RequestPermissionResponse>;
}

export interface ExtendedAgentConnection extends AgentConnection {
  readTextFile(params: acp.ReadTextFileRequest): Promise<acp.ReadTextFileResponse>;
  writeTextFile(params: acp.WriteTextFileRequest): Promise<acp.WriteTextFileResponse>;
  createTerminal(params: acp.CreateTerminalRequest): Promise<acp.TerminalHandle>;
}
