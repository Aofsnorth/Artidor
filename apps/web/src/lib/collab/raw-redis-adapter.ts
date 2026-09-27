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

/**
 * Fail fast instead of stalling for the OS default (~2 min) when REDIS_URL
 * points at an unreachable host; the probe must report "skipped" quickly.
 */
const CONNECT_TIMEOUT_MS = 2_000;

/** RESP2 frame type bytes (ASCII) as they appear in the buffer. */
const RESP_STATUS = 43; // '+'
const RESP_ERROR = 45; // '-'
const RESP_INTEGER = 58; // ':'
const RESP_BULK = 36; // '$'

const CRLF = Buffer.from("\r\n");

interface PendingReply {
	resolve: (value: unknown) => void;
	reject: (err: Error) => void;
}

export class RawRedisAdapter {
	private socket: net.Socket | null = null;
	/**
	 * Undecoded bytes from the socket. A RESP2 bulk header counts BYTES while
	 * JavaScript strings count UTF-16 units, so a value with non-ASCII content
	 * (nickname, project name) made the old string buffer wait forever for
	 * `length + 2` characters that the payload never contained. Frame parsing
	 * therefore stays on bytes and only the extracted value is decoded.
	 */
	private buffer: Buffer = Buffer.alloc(0);
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
			const timer = setTimeout(() => {
				socket.destroy();
				reject(
					new Error(
						`Redis connect timeout after ${CONNECT_TIMEOUT_MS}ms (${host}:${port})`,
					),
				);
			}, CONNECT_TIMEOUT_MS);
			// Never hold the process open just for the connect deadline.
			timer.unref?.();
			socket.on("connect", () => {
				// Clear before resolving: a late timer would destroy a live socket.
				clearTimeout(timer);
				this.socket = socket;
				resolve();
			});
			socket.on("error", (err) => {
				clearTimeout(timer);
				for (const reply of this.pending.splice(0)) {
					reply.reject(err);
				}
				if (!this.socket) reject(err);
			});
			socket.on("data", (chunk: Buffer) => {
				this.buffer =
					this.buffer.length === 0
						? chunk
						: Buffer.concat([this.buffer, chunk]);
				try {
					this.drainReplies();
				} catch (err) {
					// A `-ERR` reply or an unparsable frame used to throw straight
					// out of the socket handler: that is an uncaught exception (the
					// test process dies) AND every pending command stays awaited
					// forever. Reject them so the store's fail-closed catch runs.
					const error = err instanceof Error ? err : new Error(String(err));
					for (const reply of this.pending.splice(0)) {
						reply.reject(error);
					}
				}
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
			const frame = this.parseFrame();
			if (frame === null) return;
			// The buffer is advanced ONLY here, after a whole frame is known to be
			// present. A parser that consumed the header before checking the
			// payload resynced on the next chunk and read the value as a frame type.
			this.buffer = this.buffer.subarray(frame.consumed);
			const pending = this.pending.shift();
			pending?.resolve(frame.value);
		}
	}

	/**
	 * Parse one complete RESP2 frame from the buffer; null when the buffer does
	 * not hold a whole frame yet. Pure with respect to `this.buffer` — a
	 * half-received frame is re-parsed from the same offset once more bytes
	 * arrive.
	 */
	private parseFrame(): { value: unknown; consumed: number } | null {
		if (this.buffer.length === 0) return null;
		const type = this.buffer[0];
		const lineEnd = this.buffer.indexOf(CRLF, 1);

		switch (type) {
			case RESP_STATUS:
			case RESP_ERROR:
			case RESP_INTEGER: {
				if (lineEnd < 0) return null;
				const line = this.buffer.subarray(1, lineEnd).toString("utf8");
				if (type === RESP_ERROR) throw new Error(`Redis error: ${line}`);
				return {
					value: type === RESP_INTEGER ? Number(line) : line,
					consumed: lineEnd + 2,
				};
			}
			case RESP_BULK: {
				if (lineEnd < 0) return null;
				const length = Number(
					this.buffer.subarray(1, lineEnd).toString("utf8"),
				);
				const start = lineEnd + 2;
				if (length === -1) return { value: null, consumed: start };
				// Byte-exact: the header length counts bytes, as does buffer length.
				if (this.buffer.length < start + length + 2) return null;
				return {
					value: this.buffer.subarray(start, start + length).toString("utf8"),
					consumed: start + length + 2,
				};
			}
			default:
				// Arrays are never returned by the commands this adapter issues.
				throw new Error(
					`Redis adapter: unsupported reply type "${String.fromCharCode(type)}"`,
				);
		}
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
