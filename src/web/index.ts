import { createServer } from "./server.ts";

const server = createServer(3000);

console.log("🚀 ACP Agent Platform Server running on http://localhost:3000");
console.log("📡 WebSocket endpoint: ws://localhost:3000/ws?agentId=coding");

export { server };
