import {
	ARTPR_PROJECT_FILE_NAME,
	ARTPR_PROJECT_MIME,
	encodeArtprProject,
} from "@/lib/project-file/artpr";

export function getGoogleClientId(): string | null {
	if (typeof window === "undefined") return null;
	const envId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
	if (envId && envId.trim().length > 0) return envId;
	return localStorage.getItem("google_drive_client_id");
}

export function setGoogleClientId(clientId: string): void {
	if (typeof window !== "undefined") {
		localStorage.setItem("google_drive_client_id", clientId);
	}
}

/**
 * In-memory cache of the access token. The token is short-lived (1h)
 * and storing it in memory avoids persisting it to localStorage where
 * it would be vulnerable to XSS attacks that read localStorage.
 * sessionStorage is used as a fallback for page refreshes within the
 * same tab — it's cleared when the tab closes, unlike localStorage.
 */
let cachedAccessToken: string | null = null;

export function getGoogleAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	// Return from in-memory cache if available.
	if (cachedAccessToken) {
		const expiresAt = sessionStorage.getItem("google_drive_token_expires_at");
		if (expiresAt && Date.now() > Number.parseInt(expiresAt, 10)) {
			cachedAccessToken = null;
			sessionStorage.removeItem("google_drive_access_token_enc");
			sessionStorage.removeItem("google_drive_token_expires_at");
			return null;
		}
		return cachedAccessToken;
	}
	// Fallback to sessionStorage (survives page refresh within same tab).
	const token = sessionStorage.getItem("google_drive_access_token_enc");
	const expiresAt = sessionStorage.getItem("google_drive_token_expires_at");
	if (!token || !expiresAt) return null;
	if (Date.now() > Number.parseInt(expiresAt, 10)) {
		sessionStorage.removeItem("google_drive_access_token_enc");
		sessionStorage.removeItem("google_drive_token_expires_at");
		return null;
	}
	cachedAccessToken = token;
	return token;
}

export function setGoogleAccessToken(
	token: string,
	expiresInSeconds: number,
): void {
	if (typeof window !== "undefined") {
		cachedAccessToken = token;
		// Store in sessionStorage (per-tab, cleared on close) instead of
		// localStorage (persisted across sessions, more XSS-exposed).
		sessionStorage.setItem("google_drive_access_token_enc", token);
		const expiresAt = Date.now() + expiresInSeconds * 1000;
		sessionStorage.setItem(
			"google_drive_token_expires_at",
			expiresAt.toString(),
		);
		emitAuthChanged();
	}
}

// --- Account profile (name / email / avatar) -------------------------------
// The OAuth scopes include `openid email profile`, so once we hold an access
// token we can read the signed-in Google account from the userinfo endpoint
// and cache it for the account UI. Cleared on logout.

const PROFILE_KEY = "google_drive_profile";

export interface GoogleProfile {
	email: string;
	name?: string;
	picture?: string;
}

// Fired whenever the Drive auth state changes (sign-in, profile load, logout)
// so any mounted account UI can refresh without a shared store.
function emitAuthChanged(): void {
	if (typeof window !== "undefined") {
		window.dispatchEvent(new Event("drive-auth-changed"));
	}
}

export function getGoogleProfile(): GoogleProfile | null {
	if (typeof window === "undefined") return null;
	// A cached profile without a live token is stale — treat as signed out.
	if (!getGoogleAccessToken()) return null;
	const raw = localStorage.getItem(PROFILE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as GoogleProfile;
	} catch {
		return null;
	}
}

export async function fetchGoogleProfile(
	token: string,
): Promise<GoogleProfile | null> {
	try {
		const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return null;
		const data = (await res.json()) as {
			email?: string;
			name?: string;
			picture?: string;
		};
		if (!data.email) return null;
		const profile: GoogleProfile = {
			email: data.email,
			name: data.name,
			picture: data.picture,
		};
		if (typeof window !== "undefined") {
			localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
			emitAuthChanged();
		}
		return profile;
	} catch {
		return null;
	}
}

export function logoutGoogle(): void {
	if (typeof window !== "undefined") {
		cachedAccessToken = null;
		sessionStorage.removeItem("google_drive_access_token_enc");
		sessionStorage.removeItem("google_drive_token_expires_at");
		localStorage.removeItem(PROFILE_KEY);
		emitAuthChanged();
	}
}

const OAUTH_STATE_KEY = "google_drive_oauth_state";

/** Cryptographically-random CSRF nonce for the OAuth `state` parameter. */
function generateOAuthState(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	const state = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
		"",
	);
	// Stash it so the callback page (a separate document) can read and echo it
	// back, letting us confirm the redirect belongs to this request.
	try {
		sessionStorage.setItem(OAUTH_STATE_KEY, state);
	} catch {
		// sessionStorage can be unavailable (private mode quota); the in-memory
		// closure check still applies, so this is best-effort.
	}
	return state;
}

let oauthPromise: {
	resolve: (token: string) => void;
	reject: (err: Error) => void;
} | null = null;

export function initiateGoogleOAuth(): Promise<string> {
	const clientId = getGoogleClientId();
	if (!clientId) {
		return Promise.reject(
			new Error(
				"Google Client ID is not configured. Please set it in Settings or environment.",
			),
		);
	}

	// Clean up any existing listeners/promises
	if (oauthPromise) {
		oauthPromise.reject(new Error("Authentication cancelled by new request."));
		oauthPromise = null;
	}

	return new Promise<string>((resolve, reject) => {
		oauthPromise = { resolve, reject };

		// CSRF protection: a random `state` nonce ties this request to its
		// callback. Google echoes it back in the redirect; the callback page
		// returns it in the postMessage and we reject any mismatch. Without
		// this, a malicious page could postMessage a forged token to the opener.
		const state = generateOAuthState();

		const redirectUri = `${window.location.origin}/oauth-callback`;
		const scope =
			"openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
			clientId,
		)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(
			scope,
		)}&state=${encodeURIComponent(state)}&prompt=consent`;

		const width = 600;
		const height = 650;
		const left = window.screenX + (window.innerWidth - width) / 2;
		const top = window.screenY + (window.innerHeight - height) / 2;

		const popup = window.open(
			authUrl,
			"google-drive-oauth",
			`width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`,
		);

		if (!popup) {
			reject(
				new Error(
					"Popup blocked. Please allow popups for this site to sign in.",
				),
			);
			oauthPromise = null;
			return;
		}

		const handleMessage = async (event: MessageEvent) => {
			// Only accept messages from our own origin AND from the popup we
			// opened — a same-origin iframe/tab can't forge `event.source`.
			if (event.origin !== window.location.origin) return;
			if (event.source !== popup) return;
			if (event.data?.type === "oauth-success") {
				const { token, expiresIn, state: returnedState } = event.data;
				// Reject a token whose state doesn't match the one we issued.
				// Also validate the format to prevent forged state values.
				if (
					typeof returnedState !== "string" ||
					!/^[a-f0-9]{32}$/.test(returnedState) ||
					returnedState !== state
				) {
					window.removeEventListener("message", handleMessage);
					reject(new Error("OAuth state mismatch — sign-in rejected."));
					oauthPromise = null;
					return;
				}
				if (typeof token !== "string" || token.length === 0) {
					window.removeEventListener("message", handleMessage);
					reject(new Error("OAuth returned an invalid token."));
					oauthPromise = null;
					return;
				}
				setGoogleAccessToken(token, expiresIn || 3600);
				// Best-effort: pull the account profile so the UI can show who's
				// signed in. Never blocks sign-in if it fails.
				await fetchGoogleProfile(token);
				window.removeEventListener("message", handleMessage);
				resolve(token);
				oauthPromise = null;
			} else if (event.data?.type === "oauth-error") {
				window.removeEventListener("message", handleMessage);
				reject(new Error(event.data.error || "Google sign-in failed."));
				oauthPromise = null;
			}
		};

		window.addEventListener("message", handleMessage);

		// Poll to check if popup was closed manually
		const timer = setInterval(() => {
			if (popup.closed) {
				clearInterval(timer);
				window.removeEventListener("message", handleMessage);
				if (oauthPromise) {
					reject(new Error("Authentication popup was closed."));
					oauthPromise = null;
				}
			}
		}, 1000);
	});
}

// Drive API endpoints wrapper
export interface DriveFile {
	id: string;
	name: string;
	mimeType: string;
	size?: string;
}

async function driveFetch(url: string, init?: RequestInit): Promise<Response> {
	const token = getGoogleAccessToken();
	if (!token) {
		throw new Error("unauthenticated");
	}

	const headers = new Headers(init?.headers);
	headers.set("Authorization", `Bearer ${token}`);

	const response = await fetch(url, { ...init, headers });
	if (response.status === 401) {
		logoutGoogle();
		throw new Error("unauthenticated");
	}

	return response;
}

export async function fetchFolderMetadata(
	folderId: string,
): Promise<{ id: string; name: string }> {
	const res = await driveFetch(
		`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name`,
	);
	if (!res.ok) {
		throw new Error(`Failed to fetch folder info: HTTP ${res.status}`);
	}
	return res.json();
}

export async function fetchFolderFiles(folderId: string): Promise<DriveFile[]> {
	const q = `'${folderId}' in parents and trashed = false`;
	const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
		q,
	)}&fields=files(id,name,mimeType,size)&pageSize=1000`;

	const res = await driveFetch(url);
	if (!res.ok) {
		throw new Error(`Failed to list files in Drive folder: HTTP ${res.status}`);
	}
	const data = await res.json();
	return data.files || [];
}

export async function downloadFileBlob(fileId: string): Promise<Blob> {
	const res = await driveFetch(
		`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
	);
	if (!res.ok) {
		throw new Error(`Failed to download file: HTTP ${res.status}`);
	}
	return res.blob();
}

export async function saveProjectToDrive(
	folderId: string,
	fileId: string | null,
	projectData: unknown,
): Promise<string> {
	const projectFile = await encodeArtprProject(projectData);

	if (fileId) {
		// Update existing file
		const res = await driveFetch(
			`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": ARTPR_PROJECT_MIME,
				},
				body: projectFile,
			},
		);
		if (!res.ok) {
			throw new Error(
				`Failed to update project file on Drive: HTTP ${res.status}`,
			);
		}
		return fileId;
	}

	// Create new file
	const metadata = {
		name: ARTPR_PROJECT_FILE_NAME,
		parents: [folderId],
		mimeType: ARTPR_PROJECT_MIME,
	};

	const boundary = "artidor_multipart_boundary";
	const delimiter = `\r\n--${boundary}\r\n`;
	const closeDelimiter = `\r\n--${boundary}--\r\n`;

	const body = [
		delimiter,
		"Content-Type: application/json; charset=UTF-8\r\n\r\n",
		JSON.stringify(metadata),
		delimiter,
		`Content-Type: ${ARTPR_PROJECT_MIME}\r\n\r\n`,
		projectFile,
		closeDelimiter,
	].join("");

	const res = await driveFetch(
		"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
		{
			method: "POST",
			headers: {
				"Content-Type": `multipart/related; boundary=${boundary}`,
			},
			body,
		},
	);

	if (!res.ok) {
		throw new Error(
			`Failed to create project file on Drive: HTTP ${res.status}`,
		);
	}

	const data = await res.json();
	return data.id;
}

/**
 * Create a new Drive folder (optionally under `parentId`) and return its id.
 * Used by "Export to Drive" to give a project its own folder.
 */
export async function createDriveFolder(
	name: string,
	parentId?: string,
): Promise<string> {
	const metadata: Record<string, unknown> = {
		name,
		mimeType: "application/vnd.google-apps.folder",
	};
	if (parentId) metadata.parents = [parentId];

	const res = await driveFetch(
		"https://www.googleapis.com/drive/v3/files?fields=id",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(metadata),
		},
	);
	if (!res.ok) {
		throw new Error(`Failed to create Drive folder: HTTP ${res.status}`);
	}
	const data = await res.json();
	return data.id as string;
}

/**
 * Upload a binary media file into a Drive folder. Returns the new file id.
 * Uses a multipart upload so the metadata (name/parent) and bytes go together.
 */
export async function uploadMediaToDrive(
	folderId: string,
	file: File,
): Promise<string> {
	const metadata = {
		name: file.name,
		parents: [folderId],
	};

	const boundary = "artidor_media_boundary";
	const delimiter = `\r\n--${boundary}\r\n`;
	const closeDelimiter = `\r\n--${boundary}--\r\n`;
	const buffer = await file.arrayBuffer();

	const head =
		`${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n` +
		`${JSON.stringify(metadata)}` +
		`${delimiter}Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`;

	const body = new Blob([head, buffer, closeDelimiter]);

	const res = await driveFetch(
		"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
		{
			method: "POST",
			headers: {
				"Content-Type": `multipart/related; boundary=${boundary}`,
			},
			body,
		},
	);
	if (!res.ok) {
		throw new Error(
			`Failed to upload "${file.name}" to Drive: HTTP ${res.status}`,
		);
	}
	const data = await res.json();
	return data.id as string;
}
