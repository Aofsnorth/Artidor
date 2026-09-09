/**
 * Wire-protocol regression tests for collab command notifications.
 *
 * The protocol is deliberately minimal: `commandName` must be the fixed
 * "local-edit" tag and `args` must be an empty object. These properties are
 * what keep editor internals (undo snapshots, private command fields) from
 * being stored in room logs and relayed to other participants.
 */

import { describe, expect, test } from "bun:test";
import { isCollabNotification, LOCAL_EDIT } from "./protocol";

describe("collab notification protocol", () => {
	test("accepts the fixed tag with empty args", () => {
		expect(isCollabNotification({ commandName: LOCAL_EDIT, args: {} })).toBe(
			true,
		);
	});

	test("rejects any other command name", () => {
		expect(
			isCollabNotification({ commandName: "AddTrackCommand", args: {} }),
		).toBe(false);
		expect(
			isCollabNotification({ commandName: "delete-everything", args: {} }),
		).toBe(false);
	});

	test("rejects non-empty args — private fields must never be relayed", () => {
		expect(
			isCollabNotification({
				commandName: LOCAL_EDIT,
				args: { savedState: { private: "undo snapshot" } },
			}),
		).toBe(false);
		expect(
			isCollabNotification({ commandName: LOCAL_EDIT, args: { trackId: "t1" } }),
		).toBe(false);
	});

	test("rejects non-object args (arrays are not records)", () => {
		expect(
			isCollabNotification({
				commandName: LOCAL_EDIT,
				args: [] as unknown as Record<string, unknown>,
			}),
		).toBe(false);
	});
});
