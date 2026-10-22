import { describe, expect, test } from "bun:test";
import type { McpServerConfig } from "@/lib/mcp/client";
import { serversForPersistence } from "../mcp-store";

describe("serversForPersistence", () => {
	test("strips bearer tokens from persisted server configs", () => {
		const servers: McpServerConfig[] = [
			{
				id: "server-1",
				name: "Private MCP",
				url: "https://mcp.example.com/sse",
				token: "super-secret-token",
				enabled: true,
			},
		];

		const persisted = serversForPersistence(servers);

		expect(persisted).toHaveLength(1);
		expect(persisted[0]).not.toHaveProperty("token");
		expect(persisted[0]).toMatchObject({
			id: "server-1",
			name: "Private MCP",
			url: "https://mcp.example.com/sse",
			enabled: true,
		});
	});

	test("does not mutate the in-memory servers (tokens still work)", () => {
		const servers: McpServerConfig[] = [
			{
				id: "server-1",
				name: "Private MCP",
				url: "https://mcp.example.com/sse",
				token: "super-secret-token",
				enabled: true,
			},
		];

		serversForPersistence(servers);

		expect(servers[0]?.token).toBe("super-secret-token");
	});
});
