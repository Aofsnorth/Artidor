import { describe, expect, test } from "bun:test";
import {
	buildDriveDirectUrl,
	isValidDriveFileId,
	parseDriveFileId,
	parseDriveUrl,
	sanitizeDriveFileName,
} from "./parse";

const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz";
const FOLDER_ID = "0Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

describe("parseDriveUrl", () => {
	test("parses legacy folder links", () => {
		expect(
			parseDriveUrl({
				url: `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`,
			}),
		).toEqual({
			kind: "folder",
			id: FOLDER_ID,
			url: `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`,
		});
	});

	test("parses multi-account folder links", () => {
		expect(
			parseDriveUrl({
				url: `https://drive.google.com/drive/u/0/folders/${FOLDER_ID}`,
			}),
		).toMatchObject({ kind: "folder", id: FOLDER_ID });
		expect(
			parseDriveUrl({
				url: `https://drive.google.com/drive/u/3/folders/${FOLDER_ID}`,
			}),
		).toMatchObject({ kind: "folder", id: FOLDER_ID });
	});

	test("parses file links, including multi-account links", () => {
		expect(
			parseDriveUrl({ url: `https://drive.google.com/file/d/${FILE_ID}/view` }),
		).toMatchObject({ kind: "file", id: FILE_ID });
		expect(
			parseDriveUrl({
				url: `https://drive.google.com/file/u/1/d/${FILE_ID}/preview`,
			}),
		).toMatchObject({ kind: "file", id: FILE_ID });
		expect(
			parseDriveFileId({ url: `https://drive.google.com/open?id=${FILE_ID}` }),
		).toBe(FILE_ID);
		expect(
			parseDriveFileId({
				url: `https://drive.usercontent.google.com/download?id=${FILE_ID}`,
			}),
		).toBe(FILE_ID);
	});

	test("rejects other hosts and unrecognised paths", () => {
		expect(
			parseDriveUrl({ url: `https://example.com/file/d/${FILE_ID}/view` }),
		).toBeNull();
		expect(
			parseDriveUrl({ url: "https://drive.google.com/drive/home" }),
		).toBeNull();
		expect(parseDriveUrl({ url: "not a url" })).toBeNull();
		expect(parseDriveUrl({ url: "   " })).toBeNull();
	});
});

describe("isValidDriveFileId", () => {
	test("accepts Drive's URL-safe ID alphabet", () => {
		expect(isValidDriveFileId(FILE_ID)).toBe(true);
		expect(isValidDriveFileId("abc_DEF-1234567890")).toBe(true);
	});

	test("rejects short IDs and URL/query injection", () => {
		expect(isValidDriveFileId("short")).toBe(false);
		expect(isValidDriveFileId("abc&export=download")).toBe(false);
		expect(isValidDriveFileId("abc/def/../ghi")).toBe(false);
		expect(isValidDriveFileId("")).toBe(false);
	});
});

describe("sanitizeDriveFileName", () => {
	test("strips path separators and traversal runs", () => {
		expect(sanitizeDriveFileName("../../evil.txt")).toBe("_._evil.txt");
		expect(sanitizeDriveFileName("folder\\nested\\file.mp4")).toBe(
			"folder_nested_file.mp4",
		);
	});

	test("strips control characters, including CR/LF", () => {
		expect(sanitizeDriveFileName("clip\r\nInjected: header.mp4")).toBe(
			"clipInjected: header.mp4",
		);
		expect(sanitizeDriveFileName("nul\u0000byte.txt")).toBe("nulbyte.txt");
	});

	test("returns null when nothing safe remains", () => {
		expect(sanitizeDriveFileName("..")).toBeNull();
		expect(sanitizeDriveFileName("...")).toBeNull();
		expect(sanitizeDriveFileName("   ")).toBeNull();
		expect(sanitizeDriveFileName("\u0000\r\n")).toBeNull();
	});

	test("caps very long names", () => {
		expect(sanitizeDriveFileName("a".repeat(500))?.length).toBe(255);
	});
});

describe("buildDriveDirectUrl", () => {
	test("encodes the file id", () => {
		expect(buildDriveDirectUrl({ fileId: "a b&c" })).toBe(
			"https://drive.google.com/uc?export=download&id=a%20b%26c",
		);
	});
});
