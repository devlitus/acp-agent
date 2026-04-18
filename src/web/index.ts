import { createServer } from "./server.ts";

const PORT = Number(process.env.PORT ?? 3000);
const server = createServer(PORT);

console.log(`🚀 ACP Agent Platform Server running on http://localhost:${PORT}`);
console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws?agentId=coding`);

export { server };
