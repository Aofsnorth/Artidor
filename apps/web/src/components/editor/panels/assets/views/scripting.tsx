"use client";

/**
 * Scripting tab — a one-off automation runner over the Editor API.
 *
 * The user's script runs in an isolated worker (see services/scripting). Its
 * `artidor.run(...)` calls are relayed here and applied through editor.api, so
 * every mutation is an undoable command. Run is cancellable (worker.terminate).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Play, Square } from "lucide-react";
import { useEditor } from "@/hooks/use-editor";
import { useI18n } from "@/lib/i18n";
import { createScriptingWorker } from "@/services/scripting";
import type {
	ScriptingWorkerMessage,
	ScriptingWorkerResponse,
} from "@/services/scripting/worker";

interface LogLine {
	level: "log" | "error" | "system";
	text: string;
}

const SAMPLE_SCRIPT = `// Automate the editor via the Editor API.
// Every artidor.run(...) is applied as an undoable command.

const cmds = await artidor.commands();
artidor.log(\`\${cmds.length} commands available\`);

// Example: add a text track, then start playback.
await artidor.run("add_track", { type: "text" });
await artidor.run("play");
`;

export function ScriptingView() {
	const { t } = useI18n();
	const editor = useEditor();
	const [code, setCode] = useState(SAMPLE_SCRIPT);
	const [running, setRunning] = useState(false);
	const [output, setOutput] = useState<LogLine[]>([]);
	const workerRef = useRef<Worker | null>(null);

	const append = useCallback((line: LogLine) => {
		setOutput((prev) => [...prev, line]);
	}, []);

	const stop = useCallback(() => {
		workerRef.current?.terminate();
		workerRef.current = null;
		setRunning(false);
	}, []);

	// Terminate any running worker if the panel unmounts.
	useEffect(() => () => workerRef.current?.terminate(), []);

	const run = useCallback(() => {
		if (workerRef.current) return;
		setOutput([]);
		setRunning(true);
		const worker = createScriptingWorker();
		workerRef.current = worker;

		worker.onmessage = async (event: MessageEvent<ScriptingWorkerResponse>) => {
			const msg = event.data;
			switch (msg.type) {
				case "call": {
					let result: unknown;
					if (msg.method === "list") {
						result = editor.api.listCommands();
					} else {
						const { name, args } = msg.payload as {
							name: string;
							args: Record<string, unknown>;
						};
						result = await editor.api.run(name, args, "user");
					}
					worker.postMessage({
						type: "result",
						callId: msg.callId,
						result,
					} satisfies ScriptingWorkerMessage);
					break;
				}
				case "log":
					append({ level: msg.level, text: msg.text });
					break;
				case "done":
					append({ level: "system", text: t("scripting.scriptFinished") });
					stop();
					break;
				case "error":
					append({ level: "error", text: msg.text });
					stop();
					break;
			}
		};

		worker.onerror = (event) => {
			append({ level: "error", text: event.message });
			stop();
		};

		worker.postMessage({
			type: "exec",
			code,
		} satisfies ScriptingWorkerMessage);
	}, [code, editor, append, stop, t]);

	return (
		<div className="flex h-full flex-col gap-2 p-3">
			<div className="flex items-center justify-between">
				<div className="text-[11.5px] font-medium text-white/70">
					{t("scripting.title")}
					<span className="ml-1.5 text-white/35">
						{t("scripting.subtitle")}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					{running ? (
						<button
							type="button"
							onClick={stop}
							className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/80 transition hover:bg-white/[0.08]"
						>
							<Square className="size-3" /> {t("scripting.stop")}
						</button>
					) : (
						<button
							type="button"
							onClick={run}
							className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-black transition hover:bg-white/90"
						>
							<Play className="size-3" /> {t("scripting.run")}
						</button>
					)}
					<button
						type="button"
						onClick={() => setOutput([])}
						title={t("scripting.clearOutput")}
						className="flex items-center rounded-md border border-white/10 bg-white/[0.04] p-1 text-white/60 transition hover:bg-white/[0.08]"
					>
						<Eraser className="size-3" />
					</button>
				</div>
			</div>

			<textarea
				spellCheck={false}
				value={code}
				onChange={(event) => setCode(event.target.value)}
				className="h-1/2 w-full resize-none rounded-md border border-white/10 bg-black/30 p-2.5 font-mono text-[11.5px] leading-relaxed text-white/85 outline-none focus:border-white/25"
				placeholder={t("scripting.placeholder")}
			/>

			<div className="flex-1 overflow-auto rounded-md border border-white/10 bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed">
				{output.length === 0 ? (
					<span className="text-white/30">
						{t("scripting.outputHint", { code: "await artidor.commands()" })}
					</span>
				) : (
					output.map((line, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: append-only log, lines are never reordered
							key={index}
							className={
								line.level === "error"
									? "whitespace-pre-wrap text-red-400"
									: line.level === "system"
										? "text-emerald-400/80"
										: "whitespace-pre-wrap text-white/75"
							}
						>
							{line.text}
						</div>
					))
				)}
			</div>
		</div>
	);
}
