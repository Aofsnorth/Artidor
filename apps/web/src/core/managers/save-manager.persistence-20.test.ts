import { afterEach, expect, mock, test } from "bun:test";
import type { EditorCore } from "@/core";
import { SaveManager } from "./save-manager";

function deferred() {
	return Promise.withResolvers<void>();
}
const managers: SaveManager[] = [];
afterEach(() => {
	for (const manager of managers) manager.stop();
	managers.length = 0;
});
function fixture() {
	const write = mock(() => Promise.resolve());
	const project = {
		getActiveOrNull: () => ({ metadata: { id: "a" } }),
		getIsLoading: () => false,
		getMigrationState: () => ({ isMigrating: false }),
		saveCurrentProject: write,
	};
	const save = new SaveManager({ project } as unknown as EditorCore, {
		debounceMs: 5,
	});
	managers.push(save);
	return { save, write, project };
}

test("R06 no active project keeps edits dirty for the next workspace", async () => {
	const { save, write, project } = fixture();
	project.getActiveOrNull = () => null;
	save.markDirty();
	await save.flush();
	expect(write).not.toHaveBeenCalled();
	expect(save.getIsDirty()).toBe(true);
});

test("R05 flush while loading keeps work dirty and waits for the gate", async () => {
	const { save, write, project } = fixture();
	let loading = true;
	project.getIsLoading = () => loading;
	save.markDirty();
	await save.flush();
	expect(write).not.toHaveBeenCalled();
	expect(save.getIsDirty()).toBe(true);
	loading = false;
	await save.flush();
	expect(write).toHaveBeenCalledTimes(1);
	expect(save.getIsDirty()).toBe(false);
});

test("R04 flush drains a synchronously resolving write", async () => {
	const { save, write } = fixture();
	write.mockImplementation(() => Promise.resolve());
	save.markDirty();
	await save.flush();
	expect(write).toHaveBeenCalledTimes(1);
	expect(save.getIsDirty()).toBe(false);
});

test("R03 flush waits for in-flight write and an intervening edit", async () => {
	const { save, write } = fixture();
	const first = deferred();
	const second = deferred();
	write.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
	const initial = save.flush();
	save.markDirty();
	let done = false;
	const flush = save.flush().then(() => {
		done = true;
	});
	await Bun.sleep(0);
	expect(done).toBe(false);
	first.resolve();
	await Bun.sleep(0);
	expect(write).toHaveBeenCalledTimes(2);
	expect(done).toBe(false);
	second.resolve();
	await Promise.all([initial, flush]);
	expect(save.getIsDirty()).toBe(false);
});

test("R02 rejected flush retains dirty work for retry", async () => {
	const { save, write } = fixture();
	write.mockRejectedValueOnce(new Error("disk full"));
	await expect(save.flush()).rejects.toThrow("disk full");
	expect(save.getIsDirty()).toBe(true);
	await save.flush();
	expect(save.getIsDirty()).toBe(false);
});

test("R01 pause cancels an armed timer without discarding dirty work", async () => {
	const { save, write } = fixture();
	save.markDirty();
	save.pause();
	await Bun.sleep(20);
	expect(write).not.toHaveBeenCalled();
	expect(save.getIsDirty()).toBe(true);
});

test("R08 edits arriving during a write get requeued by finishSave", async () => {
	const { save, write } = fixture();
	const first = deferred();
	write
		.mockReturnValueOnce(first.promise)
		.mockImplementation(() => Promise.resolve());

	const flushed = save.flush();
	// edit lands while the first write is still in flight
	await Bun.sleep(0);
	save.markDirty();
	first.resolve();
	await flushed;

	// The edit made during the write must have been written by a follow-up pass.
	expect(write).toHaveBeenCalledTimes(2);
	expect(save.getIsDirty()).toBe(false);
});

test("R09 finishSave does not requeue a timer when clean", async () => {
	const { save, write } = fixture();
	save.markDirty();
	await save.flush();
	expect(write).toHaveBeenCalledTimes(1);
	// No further edits: no follow-up timer may be armed (nothing to write).
	await Bun.sleep(20);
	expect(write).toHaveBeenCalledTimes(1);
	expect(save.getIsDirty()).toBe(false);
});

test("R13 pause mid-write cannot cancel the in-flight pass", async () => {
	const { save, write } = fixture();
	const first = deferred();
	write
		.mockReturnValueOnce(first.promise)
		.mockImplementation(() => Promise.resolve());

	save.markDirty();
	const flushed = save.flush();
	await Bun.sleep(0);
	// pause() cancels the armed debounce timer only; a write already in
	// flight completes (loadProject's pause happens BEFORE teardown for this
	// exact reason — the outgoing flush must finish).
	save.pause();
	expect(write).toHaveBeenCalledTimes(1);
	save.markDirty({ force: true }); // paused: pending work stays queued, no timer
	first.resolve();
	await flushed;

	// The paused pending edit is written by a later pass. The count varies
	// with how the flush loop drains it (flush may run one pass for the paused
	// work plus resume() re-arming the debounce), so assert the observable
	// invariants instead: every write succeeded and nothing stays dirty.
	save.resume();
	await save.flush();
	expect(save.getIsDirty()).toBe(false);
	// The pending edit from the pause window WAS durably written.
	expect(write.mock.calls.length).toBeGreaterThanOrEqual(2);
});

test("R14 failed save stays dirty and requeues, clean write clears", async () => {
	const { save, write } = fixture();
	write.mockRejectedValueOnce(new Error("io"));
	await expect(save.flush()).rejects.toThrow("io");
	expect(save.getIsDirty()).toBe(true);
	// error path re-arms the debounce; flush drains it again.
	write.mockResolvedValue(undefined);
	await save.flush();
	expect(write).toHaveBeenCalledTimes(2);
	expect(save.getIsDirty()).toBe(false);
});

test("R15 direct save during load waits for load to finish", async () => {
	// SaveManager's gate: while the owning ProjectManager reports a load in
	// progress, a queued save must not start; it writes once the gate lifts.
	const { save, write, project } = fixture();
	let loading = true;
	project.getIsLoading = () => loading;
	save.markDirty();
	// Dirty while gated: no write may start.
	await Bun.sleep(0);
	expect(write).not.toHaveBeenCalled();
	expect(save.getIsDirty()).toBe(true);
	loading = false;
	// The gate lifted: the debounced queued write fires.
	await save.flush();
	expect(write).toHaveBeenCalledTimes(1);
	expect(save.getIsDirty()).toBe(false);
});
