/**
 * Protocol-level regression tests for the raw-TCP Redis adapter.
 *
 * These need no Redis server: a `node:net` server speaking RESP2 by hand is
 * enough to drive the exact wire cases the adapter mishandled — a multi-byte
 * UTF-8 value split across TCP chunks, an error reply, and a host that never
 * completes the handshake. Each case reproduced a real failure (silent data
 * corruption, an uncaught exception with permanently hanging commands, and a
 * multi-minute stall) that the store's fail-closed catch could never observe
 * because the failure happened outside the promise chain.
 */

import net from "node:net";
import { describe, expect, test } from "bun:test";
import { RawRedisAdapter } from "./raw-redis-adapter";

/** Minimal RESP2 server that hands raw bytes to the test. */
function startServer(
	onConnection: (socket: net.Socket) => void,
): Promise<{ port: number; close: () => Promise<void> }> {
	return new Promise((resolve, reject) => {
		const server = net.createServer(onConnection);
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			if (address === null || typeof address === "string") {
				reject(new Error("server did not bind a TCP port"));
				return;
			}
			resolve({
				port: address.port,
				close: () =>
					new Promise<void>((done) => {
						server.close(() => done());
					}),
			});
		});
	});
}

describe("RawRedisAdapter protocol handling", () => {
	test("decodes a multi-byte value split across TCP chunk boundaries", async () => {
		const payload = "nāmé-🎬-日本";
		const bytes = Buffer.from(payload, "utf8");
		// Split in the MIDDLE of the 4-byte emoji so a per-chunk toString("utf8")
		// would emit replacement characters.
		const cut = 6;
		const server = await startServer((socket) => {
			socket.on("data", () => {
				socket.write(`$${bytes.length}\r\n`);
				socket.write(bytes.subarray(0, cut));
				// Force the boundary onto a separate TCP segment.
				setTimeout(() => {
					socket.write(bytes.subarray(cut));
					socket.write("\r\n");
				}, 5);
			});
		});

		const adapter = new RawRedisAdapter(`redis://127.0.0.1:${server.port}`);
		try {
			await adapter.connect();
			const value = await adapter.get("room");
			expect(value).toBe(payload);
		} finally {
			adapter.close();
			await server.close();
		}
	}, 10000);

	test("an error reply rejects the command instead of crashing the process", async () => {
		const server = await startServer((socket) => {
			socket.on("data", () => {
				socket.write("-ERR unknown command 'EVAL'\r\n");
			});
		});

		const adapter = new RawRedisAdapter(`redis://127.0.0.1:${server.port}`);
		try {
			await adapter.connect();
			// Must reject (not hang, not throw out of the socket handler).
			await expect(adapter.get("room")).rejects.toThrow(/unknown command/);
			// The connection stays usable after the rejection.
			await expect(adapter.get("room")).rejects.toThrow(/unknown command/);
		} finally {
			adapter.close();
			await server.close();
		}
	}, 10000);

	test("a closed port rejects fast instead of stalling the probe", async () => {
		// The adapter's own deadline only fires for a blackholed SYN, which a
		// local listener cannot reproduce (TCP connect resolves on accept). What is
		// verifiable here is the other half of "fail fast": a refused connection
		// must reject, so the suite reports "skipped" instead of hanging.
		const server = await startServer(() => {
			// noop
		});
		const port = server.port;
		await server.close();

		const adapter = new RawRedisAdapter(`redis://127.0.0.1:${port}`);
		const startedAt = Date.now();
		try {
			await adapter.connect();
			throw new Error("connect should not have resolved");
		} catch (err) {
			expect(err).toBeInstanceOf(Error);
			expect((err as Error).message).not.toBe("connect should not have resolved");
		} finally {
			adapter.close();
		}
		expect(Date.now() - startedAt).toBeLessThan(6_000);
	}, 10000);
});
