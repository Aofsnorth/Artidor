/**
 * Wire protocol contract for collab command notifications.
 *
 * `commandName` must always be exactly "local-edit" and `args` must be empty.
 * The payload carries no editor state: remote command execution is not
 * implemented, so any richer payload would be data the receiver can't safely
 * or correctly apply. Old clients sent command fields as args — validation
 * here keeps the server from ever relaying that data to other participants.
 */

/** The only command notification currently defined. */
export const LOCAL_EDIT = "local-edit";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate a command notification before storage or use.
 * Accepts legacy empty payloads so pre-protocol commands already stored in
 * live rooms aren't dropped wholesale, while rejecting anything richer.
 */
export function isCollabNotification(value: {
	commandName: string;
	args: Record<string, unknown>;
}): boolean {
	if (value.commandName !== LOCAL_EDIT) return false;
	return isRecord(value.args) && Object.keys(value.args).length === 0;
}
