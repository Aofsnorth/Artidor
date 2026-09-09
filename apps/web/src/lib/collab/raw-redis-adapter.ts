/**
 * Raw-TCP Redis adapter for the collab store test suite.
 *
 * Production rooms run on the Upstash REST gateway (https:// only). The test
 * suite must prove CAS atomicity against a REAL Redis, so it talks the raw
 * RESP2 protocol directly with `node:net` — no new dependency, no REST gateway,
 * and no in-memory mock that would fabricate atomicity.
 *
 * Implements only the surface the room store needs: GET, SET (EX/NX), EVAL.
 * Every reply is parsed with a minimal RESP reader; errors are thrown so the
 * store's fail-closed catch turns them into CollabStoreUnavailableError.
 */

import net from "node:net";

interface PendingReply {
	resolve: (value: unknown) => void;
	reject: (err: Error) => void;
}

export class RawRedisAdapter {
	private socket: net.Socket | null = null;
	private buffer = "";
	private pending: PendingReply[] = [];
	private connectPromise: Promise<void> | null = null;

	constructor(private url: string) {}

	private parseUrl(): { host: string; port: number } {
		const parsed = new URL(this.url);
		return {
			host: parsed.hostname || "127.0.0.1",
			port: Number(parsed.port || 6379),
		};
	}

	async connect(): Promise<void> {
		if (this.connectPromise) return this.connectPromise;
		this.connectPromise = new Promise<void>((resolve, reject) => {
			const { host, port } = this.parseUrl();
			const socket = net.connect({ host, port });
			socket.setNoDelay(true);
			socket.on("connect", () => {
				this.socket = socket;
				resolve();
			});
			socket.on("error", (err) => {
				for (const reply of this.pending.splice(0)) {
					reply.reject(err);
				}
				if (!this.socket) reject(err);
			});
			socket.on("data", (chunk: Buffer) => {
				this.buffer += chunk.toString("utf8");
				this.drainReplies();
			});
			socket.on("close", () => {
				const err = new Error("Redis connection closed");
				for (const reply of this.pending.splice(0)) {
					reply.reject(err);
				}
				this.socket = null;
				this.connectPromise = null;
			});
		});
		return this.connectPromise;
	}

	private drainReplies(): void {
		while (this.pending.length > 0) {
			const reply = this.parseReply();
			if (reply === null) return;
			const pending = this.pending.shift();
			pending?.resolve(reply.value);
		}
	}

	/** Parse one complete RESP2 reply from the buffer; null if incomplete. */
	private parseReply(): { value: unknown } | null {
		if (this.buffer.length === 0) return null;
		const type = this.buffer[0];

		if (type === "+" || type === "-") {
			const lineEnd = this.buffer.indexOf("\r\n", 1);
			if (lineEnd < 0) return null;
			const line = this.buffer.slice(1, lineEnd);
			this.buffer = this.buffer.slice(lineEnd + 2);
			if (type === "-") throw new Error(`Redis error: ${line}`);
			return { value: line };
		}

		if (type === ":") {
			const lineEnd = this.buffer.indexOf("\r\n", 1);
			if (lineEnd < 0) return null;
			const value = Number(this.buffer.slice(1, lineEnd));
			this.buffer = this.buffer.slice(lineEnd + 2);
			return { value };
		}

		if (type === "$") {
			const lineEnd = this.buffer.indexOf("\r\n", 1);
			if (lineEnd < 0) return null;
			const length = Number(this.buffer.slice(1, lineEnd));
			this.buffer = this.buffer.slice(lineEnd + 2);
			if (length === -1) return { value: null };
			if (this.buffer.length < length + 2) {
				// Not enough bytes yet; restore the header so a later call retries.
				this.buffer = `$${length}\r\n${this.buffer}`;
				return null;
			}
			const value = this.buffer.slice(0, length);
			this.buffer = this.buffer.slice(length + 2);
			return { value };
		}

		// Arrays are never returned by the commands this adapter issues.
		throw new Error(`Redis adapter: unsupported reply type "${type}"`);
	}

	private encodeCommand(args: (string | number)[]): string {
		let out = `*${args.length}\r\n`;
		for (const arg of args) {
			const value = String(arg);
			out += `$${Buffer.byteLength(value, "utf8")}\r\n${value}\r\n`;
		}
		return out;
	}

	private send(args: (string | number)[]): Promise<unknown> {
		return new Promise<unknown>((resolve, reject) => {
			if (!this.socket) {
				reject(new Error("Redis adapter not connected"));
				return;
			}
			this.pending.push({ resolve, reject });
			this.socket.write(this.encodeCommand(args));
		});
	}

	/** GET key — string value or null. */
	async get(key: string): Promise<string | null> {
		const value = await this.send(["GET", key]);
		return typeof value === "string" ? value : null;
	}

	/** SET key value [EX seconds] [NX] — "OK" or null when NX did not apply. */
	async set(
		key: string,
		value: string,
		opts?: { ex?: number; nx?: boolean },
	): Promise<string | null> {
		const args: (string | number)[] = ["SET", key, value];
		if (opts?.ex != null) args.push("EX", opts.ex);
		if (opts?.nx) args.push("NX");
		const result = await this.send(args);
		// RESP2 SET NX failure is a nil reply; Upstash returns null there too.
		return result === null ? null : String(result);
	}

	/** EVAL script numkeys key [args...] — Lua integer replies come back as numbers. */
	async eval(
		script: string,
		keys: string[],
		args: (string | number)[],
	): Promise<unknown> {
		const all: (string | number)[] = ["EVAL", script, keys.length];
		for (const key of keys) all.push(key);
		for (const arg of args) all.push(arg);
		return this.send(all);
	}

	close(): void {
		this.socket?.end();
		this.socket = null;
		this.connectPromise = null;
	}
}
