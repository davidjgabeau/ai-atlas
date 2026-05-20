import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createAiAtlasMcpServer } from "@/mcp/server";

async function main() {
  const server = createAiAtlasMcpServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AI Atlas MCP server failed: ${message}`);
  process.exit(1);
});
