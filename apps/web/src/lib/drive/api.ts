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

export function getGoogleAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	const token = localStorage.getItem("google_drive_access_token");
	const expiresAt = localStorage.getItem("google_drive_token_expires_at");
	if (!token || !expiresAt) return null;
	if (Date.now() > Number.parseInt(expiresAt, 10)) {
		localStorage.removeItem("google_drive_access_token");
		localStorage.removeItem("google_drive_token_expires_at");
		return null;
	}
	return token;
}

export function setGoogleAccessToken(
	token: string,
	expiresInSeconds: number,
): void {
	if (typeof window !== "undefined") {
		localStorage.setItem("google_drive_access_token", token);
		const expiresAt = Date.now() + expiresInSeconds * 1000;
		localStorage.setItem("google_drive_token_expires_at", expiresAt.toString());
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
		localStorage.removeItem("google_drive_access_token");
		localStorage.removeItem("google_drive_token_expires_at");
		localStorage.removeItem(PROFILE_KEY);
		emitAuthChanged();
	}
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

		const redirectUri = `${window.location.origin}/oauth-callback`;
		const scope =
			"openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly";
		const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
			clientId,
		)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(
			scope,
		)}&prompt=consent`;

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
			if (event.origin !== window.location.origin) return;
			if (event.data?.type === "oauth-success") {
				const { token, expiresIn } = event.data;
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
	const projectJson = JSON.stringify(projectData);

	if (fileId) {
		// Update existing file
		const res = await driveFetch(
			`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: projectJson,
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
		name: "artidor.json",
		parents: [folderId],
		mimeType: "application/json",
	};

	const boundary = "artidor_multipart_boundary";
	const delimiter = `\r\n--${boundary}\r\n`;
	const closeDelimiter = `\r\n--${boundary}--\r\n`;

	const body = [
		delimiter,
		"Content-Type: application/json; charset=UTF-8\r\n\r\n",
		JSON.stringify(metadata),
		delimiter,
		"Content-Type: application/json\r\n\r\n",
		projectJson,
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
