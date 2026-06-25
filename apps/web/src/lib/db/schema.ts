import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: text("id").primaryKey(),

	// todo: implement fully anonymous sign-in for privacy
	// we don't have any auth flows currently so this is fine for now
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp("updated_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
}).enableRLS();

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
}).enableRLS();

export const accounts = pgTable("accounts", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
}).enableRLS();

/**
 * User feedback table. Stores feedback submitted from the in-editor
 * feedback prompt and the help menu. Each entry includes an optional
 * rating (1-5), category, and the user's email if authenticated.
 */
export const feedback = pgTable("feedback", {
	id: text("id").primaryKey(),
	userId: text("user_id"),
	email: text("email"),
	message: text("message").notNull(),
	rating: integer("rating"),
	category: text("category"),
	createdAt: timestamp("created_at")
		.$defaultFn(() => new Date())
		.notNull(),
});

// Mirror the `waitlist` table from the SQL migration so Drizzle clients can
// query it. It is not yet referenced from any feature code, but defining
// it here keeps the typed schema complete and prevents drift if a future
// feature needs it.
export const waitlist = pgTable("waitlist", {
	id: text("id").primaryKey(),
	email: text("email").notNull().unique(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
}).enableRLS();

export const verifications = pgTable("verifications", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
	updatedAt: timestamp("updated_at").$defaultFn(
		() => /* @__PURE__ */ new Date(),
	),
}).enableRLS();

// Read-only project shares (the "invite collaborators" feature). Capability
// based: the random `id` is the share link, the `manageToken` (only its hash
// is stored) lets the creator revoke. `payload` is opaque JSON written by the
// owner's browser — it carries where the read-only viewer loads the project
// from (the public Google Drive folder id, the project file id, and a media
// manifest). The server only stores it and hands it back once the optional
// `passwordHash` (scrypt) is satisfied; it never inspects the payload.
export const shares = pgTable("shares", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	payload: text("payload").notNull(),
	passwordHash: text("password_hash"),
	manageTokenHash: text("manage_token_hash").notNull(),
	createdAt: timestamp("created_at")
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
}).enableRLS();
