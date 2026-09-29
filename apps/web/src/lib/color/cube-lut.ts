/**
 * `.cube` LUT parser (Adobe cube spec, as written by DaVinci Resolve,
 * Premiere and After Effects).
 *
 * Pure logic: no DOM, no GPU, no dependencies. The parser never throws for
 * malformed input — it returns a discriminated result so callers can surface
 * a precise reason in the UI.
 *
 * ## 3D data ordering (important)
 *
 * `kind === "3d"` data holds `size ** 3` RGB triples in **R-fastest** order:
 * the red channel index advances fastest, then green, then blue. That is what
 * the `.cube` spec mandates and what Resolve exports.
 *
 * We keep that order verbatim and never reshuffle it, because the convention
 * falls out naturally as a GPU texture layout:
 *
 * ```text
 * index = (blue * size + green) * size + red   // then * 3 for the component
 * ```
 *
 * which maps 1:1 onto a `TEXTURE_3D` whose axes are `x = red`, `y = green`,
 * `z = blue` with hardware linear filtering — no transposition step between
 * the parsed array and a GPU upload. (A predecessor CPU sampler lived in
 * `@/lib/colors/lut.ts`; it was removed together with the zero-pass LUT
 * panel it served.)
 *
 * `kind === "1d"` holds exactly `size` RGB triples, index `n` being input
 * level `n / (size - 1)` within the domain.
 */

// ---------------------------------------------------------------------------
// Char codes — inlined literals keep the hot scan loop free of property loads.
// ---------------------------------------------------------------------------

const TAB = 9;
const CR = 13;
const SPACE = 32;
const QUOTE = 34;
const HASH = 35;
const PLUS = 43;
const MINUS = 45;
const DOT = 46;
const ZERO = 48;
const NINE = 57;
const EXP_UPPER = 69;
const EXP_LOWER = 101;
const BYTE_ORDER_MARK = 0xfeff;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type CubeLutKind = "1d" | "3d";

export interface CubeLut {
	title: string | null;
	kind: CubeLutKind;
	/**
	 * Entries per axis. For `"3d"` the data length is `size ** 3 * 3`.
	 */
	size: number;
	domainMin: [number, number, number];
	domainMax: [number, number, number];
	/**
	 * `kind === "1d"`: `size` RGB triples.
	 * `kind === "3d"`: `size ** 3` RGB triples in R-fastest order — see the
	 * module header for why that ordering is preserved.
	 *
	 * Values are stored as float32 because that is what the GPU wants; the
	 * observed ranges below are derived from the stored floats, so they are
	 * exactly the range the shader will sample.
	 */
	data: Float32Array;
	/** Observed per-channel range actually present in the data. */
	observedMin: [number, number, number];
	/** Observed per-channel range actually present in the data. */
	observedMax: [number, number, number];
}

export type CubeLutErrorReason =
	/** No data rows at all. */
	| "empty"
	/** Data rows present, but neither `LUT_1D_SIZE` nor LUT_3D_SIZE declared. */
	| "missing-size"
	/** A declared size (or its literal) is outside the allowed bounds. */
	| "size-out-of-range"
	/** Both a 1D and a 3D size were declared; the file is ambiguous. */
	| "conflicting-size"
	/** A data line is not exactly three finite numbers. `line` is set. */
	| "malformed-row"
	/** Row count does not match the declared size. */
	| "size-mismatch"
	/** Input exceeded the byte cap. `limit` is set. */
	| "too-large";

export interface CubeLutError {
	reason: CubeLutErrorReason;
	/** Human-readable, safe to show in the UI. */
	message: string;
	/** 1-based line number, when the reason is line-addressable. */
	line?: number;
	/** The cap that was exceeded, when the reason is `too-large`. */
	limit?: number;
}

export type ParseCubeLutResult =
	| { ok: true; lut: CubeLut }
	| { ok: false; error: CubeLutError };

export interface ParseCubeLutOptions {
	/**
	 * Reject inputs longer than this many UTF-16 code units before allocating
	 * anything. Defaults to `MAX_CUBE_FILE_BYTES`. Primarily a seam for tests
	 * and for callers that compute a tighter per-file budget themselves.
	 */
	maxBytes?: number;
}

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

export const MIN_CUBE_3D_SIZE = 2;
export const MAX_CUBE_3D_SIZE = 64;
export const MIN_CUBE_1D_SIZE = 2;
export const MAX_CUBE_1D_SIZE = 4096;

/**
 * Byte cap applied before parsing.
 *
 * Reasoning: the largest legitimate 3D LUT we accept is 64³ = 262 144 rows.
 * Real exporters print 6–8 significant digits, so a row costs roughly 24–40
 * bytes of text (`-0.000000 1.000000 0.500000\r\n` is already 26), putting the
 * worst realistic case near 8–10 MB. A 32 MiB cap therefore leaves ~3x of
 * headroom over the largest file that is actually meaningful, while still
 * bounding a hostile or garbage file before we decode it into a JS string.
 *
 * The 1D ceiling is irrelevant here by comparison: 4096 entries is ~100 KB.
 *
 * The guard measures UTF-16 code units, which equals the byte length for the
 * ASCII keywords and numbers a `.cube` file is made of, and is <= the byte
 * length for the rest — so it is a lower bound on real bytes either way.
 */
export const MAX_CUBE_FILE_BYTES = 32 * 1024 * 1024;

/**
 * Per-row text budget used by `estimateCubeBytes`. Matches what exporters
 * actually emit: 6–8 decimals per channel is `-0.000000 1.000000 0.500000`,
 * 26 bytes with the newline. A file printed at full double precision would
 * exceed this, which is why the result is an estimate and not a bound.
 */
const CUBE_BYTES_PER_ENTRY = 32;

/** Generous budget for the header block (title, domain, comments). */
const CUBE_BYTES_HEADER = 128;

/**
 * Upper-bound the *text* size of a `.cube` file for the given geometry, so the
 * UI can refuse an implausibly large file before reading it into memory.
 *
 * Returns `0` for a size that is not a non-negative integer — the caller should
 * range-check the size first; there is nothing sensible to estimate.
 *
 * A 3D LUT's decoded `Float32Array` is only 3 MB at 64³, so this is a guard
 * against text-level abuse, not against the decoded payload.
 */
export const estimateCubeBytes = ({
	kind,
	size,
}: {
	kind: CubeLutKind;
	size: number;
}): number => {
	if (!Number.isInteger(size) || size < 0) {
		return 0;
	}
	const entries = kind === "1d" ? size : size * size * size;
	return CUBE_BYTES_HEADER + entries * CUBE_BYTES_PER_ENTRY;
};

// ---------------------------------------------------------------------------
// Low-level scanning primitives
// ---------------------------------------------------------------------------

const isSpace = (code: number): boolean =>
	code === SPACE ||
	code === TAB ||
	code === CR ||
	code === 10 ||
	code === 11 ||
	code === 12;

const isUpperLetter = (code: number): boolean => code >= 65 && code <= 90;

const isDigit = (code: number): boolean => code >= ZERO && code <= NINE;

const skipSpaces = (src: string, from: number, limit: number): number => {
	let cursor = from;
	while (cursor < limit && isSpace(src.charCodeAt(cursor))) {
		cursor += 1;
	}
	return cursor;
};

/**
 * Matches `word` at `from`, requiring the following character to be whitespace
 * or the end of the line so that `LUT_3D_SIZEX` does not match `LUT_3D_SIZE`.
 * Returns the index just past the word, or `-1`.
 */
const matchWord = (
	src: string,
	from: number,
	limit: number,
	word: string,
): number => {
	if (from + word.length > limit) {
		return -1;
	}
	for (let offset = 0; offset < word.length; offset += 1) {
		if (src.charCodeAt(from + offset) !== word.charCodeAt(offset)) {
			return -1;
		}
	}
	const after = from + word.length;
	if (after < limit) {
		const code = src.charCodeAt(after);
		if (code !== SPACE && code !== TAB) {
			return -1;
		}
	}
	return after;
};

/**
 * Reads one plain decimal literal (`[+-]? (digits [. digits] | . digits)
 * [eE [+-] digits]`) at `pos` into `out[outIndex]`.
 *
 * Returns the index just past the literal, or `-1` when there is no valid
 * literal at `pos`. Rejects `NaN`, `Infinity`, hex and trailing garbage by
 * construction rather than by post-hoc coercion checks.
 *
 * The one allocation per number is the short `slice` handed to `Number`;
 * V8 makes that a sliced string and it dies immediately. No array, object or
 * buffer is allocated per row.
 */
const scanNumber = (
	src: string,
	pos: number,
	limit: number,
	out: Float32Array,
	outIndex: number,
): number => {
	let cursor = pos;
	if (cursor < limit) {
		const sign = src.charCodeAt(cursor);
		if (sign === PLUS || sign === MINUS) {
			cursor += 1;
		}
	}
	let digits = 0;
	let seenDot = false;
	while (cursor < limit) {
		const code = src.charCodeAt(cursor);
		if (isDigit(code)) {
			digits += 1;
			cursor += 1;
			continue;
		}
		if (code === DOT && seenDot === false) {
			seenDot = true;
			cursor += 1;
			continue;
		}
		break;
	}
	if (digits === 0) {
		return -1;
	}
	if (cursor < limit) {
		const code = src.charCodeAt(cursor);
		if (code === EXP_UPPER || code === EXP_LOWER) {
			cursor += 1;
			if (cursor < limit) {
				const expSign = src.charCodeAt(cursor);
				if (expSign === PLUS || expSign === MINUS) {
					cursor += 1;
				}
			}
			let expDigits = 0;
			while (cursor < limit && isDigit(src.charCodeAt(cursor))) {
				expDigits += 1;
				cursor += 1;
			}
			if (expDigits === 0) {
				return -1;
			}
		}
	}
	// The slice spans the sign too; `Number` handles it (including `-0`).
	out[outIndex] = Number(src.slice(pos, cursor));
	return cursor;
};

/**
 * Reads exactly three numbers followed only by whitespace or a trailing `#`
 * comment. Returns the index just past the triple, or `-1`.
 *
 * Finiteness is checked against the *stored float32*, so a literal that
 * overflows float32 (`1e999`, `1e39`) is rejected on the same footing as a
 * literal that says `Infinity`.
 */
const scanTriple = (
	src: string,
	start: number,
	limit: number,
	out: Float32Array,
	outIndex: number,
): number => {
	let cursor = start;
	for (let channel = 0; channel < 3; channel += 1) {
		cursor = skipSpaces(src, cursor, limit);
		const next = scanNumber(src, cursor, limit, out, outIndex + channel);
		if (next === -1 || Number.isFinite(out[outIndex + channel]) === false) {
			return -1;
		}
		cursor = next;
	}
	cursor = skipSpaces(src, cursor, limit);
	if (cursor < limit && src.charCodeAt(cursor) !== HASH) {
		return -1;
	}
	return cursor;
};

// ---------------------------------------------------------------------------
// Keyword handling
// ---------------------------------------------------------------------------

const KEY_TITLE = "TITLE";
const KEY_SIZE_1D = "LUT_1D_SIZE";
const KEY_SIZE_3D = "LUT_3D_SIZE";
const KEY_DOMAIN_MIN = "DOMAIN_MIN";
const KEY_DOMAIN_MAX = "DOMAIN_MAX";

/**
 * The keyword a line opens with, or `null` when it opens with data.
 *
 * Only ever called for lines whose first character is an uppercase letter, so
 * the five-word scan never runs for the ~262k data rows of a 64³ LUT.
 */
const matchKeyword = (
	src: string,
	cursor: number,
	limit: number,
): string | null => {
	if (matchWord(src, cursor, limit, KEY_TITLE) !== -1) {
		return KEY_TITLE;
	}
	if (matchWord(src, cursor, limit, KEY_SIZE_1D) !== -1) {
		return KEY_SIZE_1D;
	}
	if (matchWord(src, cursor, limit, KEY_SIZE_3D) !== -1) {
		return KEY_SIZE_3D;
	}
	if (matchWord(src, cursor, limit, KEY_DOMAIN_MIN) !== -1) {
		return KEY_DOMAIN_MIN;
	}
	if (matchWord(src, cursor, limit, KEY_DOMAIN_MAX) !== -1) {
		return KEY_DOMAIN_MAX;
	}
	return null;
};

/**
 * The value of a `TITLE` line, starting at the first non-space character.
 *
 * Quotes are optional. A missing closing quote is tolerated: the title simply
 * runs to the end of the line.
 */
const readTitle = (
	src: string,
	start: number,
	limit: number,
): string | null => {
	let from = skipSpaces(src, start, limit);
	let stop = limit;
	while (stop > from && isSpace(src.charCodeAt(stop - 1))) {
		stop -= 1;
	}
	if (from < stop && src.charCodeAt(from) === QUOTE) {
		from += 1;
		for (let cursor = from; cursor < stop; cursor += 1) {
			if (src.charCodeAt(cursor) === QUOTE) {
				stop = cursor;
				break;
			}
		}
	} else if (stop > from && src.charCodeAt(stop - 1) === QUOTE) {
		// `TITLE Spaced Out"` — an unpaired trailing quote is dropped rather
		// than kept in the visible name.
		stop -= 1;
	}
	return from < stop ? src.slice(from, stop) : null;
};

/**
 * The integer payload of a `LUT_*_SIZE` line. Returns `NaN` for anything that
 * is not a plain number, which the range check then rejects.
 */
const readSizeValue = (src: string, start: number, limit: number): number => {
	const from = skipSpaces(src, start, limit);
	let stop = from;
	while (stop < limit && isSpace(src.charCodeAt(stop)) === false) {
		stop += 1;
	}
	return Number(src.slice(from, stop));
};

/**
 * Reads a `DOMAIN_*` triple into `target`. A line that does not hold three
 * finite numbers leaves `target` untouched, so the documented defaults stand.
 */
const readDomain = (
	src: string,
	start: number,
	limit: number,
	target: [number, number, number],
): void => {
	const scratch = new Float32Array(3);
	let cursor = start;
	for (let channel = 0; channel < 3; channel += 1) {
		cursor = skipSpaces(src, cursor, limit);
		const next = scanNumber(src, cursor, limit, scratch, channel);
		if (next === -1 || Number.isFinite(scratch[channel]) === false) {
			return;
		}
		cursor = next;
	}
	target[0] = scratch[0];
	target[1] = scratch[1];
	target[2] = scratch[2];
};

// ---------------------------------------------------------------------------
// Two-pass parse
//
// Pass 1 harvests metadata and counts data rows; pass 2 re-walks the string and
// writes straight into the final Float32Array. Two linear scans of a string
// that is already resident beat one scan plus a growable row buffer, and they
// buy us order-independence for free: a `LUT_3D_SIZE` that appears *after* the
// data is still seen before anything is allocated.
// ---------------------------------------------------------------------------

interface CubeLutHeader {
	title: string | null;
	/** `null` when undeclared; `NaN` when declared with an unusable literal. */
	size1d: number | null;
	/** `null` when undeclared; `NaN` when declared with an unusable literal. */
	size3d: number | null;
	domainMin: [number, number, number];
	domainMax: [number, number, number];
	dataRows: number;
	/** Line of the first line that starts with a letter but no known keyword. */
	firstBadLine: number | null;
}

const readHeader = (source: string): CubeLutHeader => {
	const header: CubeLutHeader = {
		title: null,
		size1d: null,
		size3d: null,
		domainMin: [0, 0, 0],
		domainMax: [1, 1, 1],
		dataRows: 0,
		firstBadLine: null,
	};
	let pos = source.charCodeAt(0) === BYTE_ORDER_MARK ? 1 : 0;
	let lineNumber = 0;

	while (pos <= source.length) {
		const newline = source.indexOf("\n", pos);
		const rawEnd = newline === -1 ? source.length : newline;
		const limit =
			rawEnd > pos && source.charCodeAt(rawEnd - 1) === CR
				? rawEnd - 1
				: rawEnd;
		lineNumber += 1;

		const cursor = skipSpaces(source, pos, limit);
		if (cursor < limit && source.charCodeAt(cursor) !== HASH) {
			// Only a letter can open a keyword, so the 5-word scan is skipped
			// entirely for every data row.
			const letter = isUpperLetter(source.charCodeAt(cursor));
			const key = letter ? matchKeyword(source, cursor, limit) : null;
			const value =
				key === null ? limit : skipSpaces(source, cursor + key.length, limit);

			if (key === KEY_TITLE) {
				header.title = readTitle(source, value, limit);
			} else if (key === KEY_SIZE_3D) {
				header.size3d = readSizeValue(source, value, limit);
			} else if (key === KEY_SIZE_1D) {
				header.size1d = readSizeValue(source, value, limit);
			} else if (key === KEY_DOMAIN_MIN) {
				readDomain(source, value, limit, header.domainMin);
			} else if (key === KEY_DOMAIN_MAX) {
				readDomain(source, value, limit, header.domainMax);
			} else {
				header.dataRows += 1;
				if (letter && header.firstBadLine === null) {
					header.firstBadLine = lineNumber;
				}
			}
		}

		pos = rawEnd + 1;
	}

	return header;
};

interface CubeLutFill {
	rows: number;
	badLine: number | null;
	observedMin: [number, number, number];
	observedMax: [number, number, number];
}

const readData = (source: string, data: Float32Array): CubeLutFill => {
	const capacity = data.length / 3;
	const fill: CubeLutFill = {
		rows: 0,
		badLine: null,
		observedMin: [
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
		],
		observedMax: [
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		],
	};
	let pos = source.charCodeAt(0) === BYTE_ORDER_MARK ? 1 : 0;
	let lineNumber = 0;

	while (pos <= source.length) {
		const newline = source.indexOf("\n", pos);
		const rawEnd = newline === -1 ? source.length : newline;
		const limit =
			rawEnd > pos && source.charCodeAt(rawEnd - 1) === CR
				? rawEnd - 1
				: rawEnd;
		lineNumber += 1;

		const cursor = skipSpaces(source, pos, limit);
		if (
			cursor < limit &&
			source.charCodeAt(cursor) !== HASH &&
			matchKeyword(source, cursor, limit) === null
		) {
			// Rows past `capacity` are still counted — that surplus is exactly
			// what turns into `size-mismatch` — but are not written.
			if (fill.rows < capacity) {
				const base = fill.rows * 3;
				if (scanTriple(source, cursor, limit, data, base) === -1) {
					fill.badLine = lineNumber;
					return fill;
				}
				for (let channel = 0; channel < 3; channel += 1) {
					const value = data[base + channel];
					if (value < fill.observedMin[channel]) {
						fill.observedMin[channel] = value;
					}
					if (value > fill.observedMax[channel]) {
						fill.observedMax[channel] = value;
					}
				}
			}
			fill.rows += 1;
		}

		pos = rawEnd + 1;
	}

	return fill;
};

const fail = (
	reason: CubeLutErrorReason,
	message: string,
	extra?: { line?: number; limit?: number },
): ParseCubeLutResult => ({
	ok: false,
	error: { reason, message, ...extra },
});

const earliestLine = (a: number | null, b: number | null): number | null => {
	if (a === null) {
		return b;
	}
	if (b === null) {
		return a;
	}
	return a < b ? a : b;
};

/**
 * Parse the text of a `.cube` file.
 *
 * Two linear scans, no per-row allocation, and a single exact-sized
 * `Float32Array`. Never throws.
 *
 * Error precedence, most fundamental first:
 * `too-large` → `conflicting-size` → `size-out-of-range` → `empty` →
 * `missing-size` → `malformed-row` → `size-mismatch`.
 */
export const parseCubeLut = (
	source: string,
	options?: ParseCubeLutOptions,
): ParseCubeLutResult => {
	const maxBytes = options?.maxBytes ?? MAX_CUBE_FILE_BYTES;
	if (source.length > maxBytes) {
		return fail(
			"too-large",
			`File is ${source.length} bytes, over the ${maxBytes} byte limit.`,
			{ limit: maxBytes },
		);
	}

	const header = readHeader(source);

	const has1d = header.size1d !== null;
	const has3d = header.size3d !== null;
	if (has1d && has3d) {
		return fail(
			"conflicting-size",
			"File declares both LUT_1D_SIZE and LUT_3D_SIZE; it is ambiguous.",
		);
	}

	let kind: CubeLutKind | null = null;
	let size: number | null = null;
	if (has3d) {
		kind = "3d";
		size = header.size3d;
	} else if (has1d) {
		kind = "1d";
		size = header.size1d;
	}

	if (kind !== null && size !== null) {
		const min = kind === "3d" ? MIN_CUBE_3D_SIZE : MIN_CUBE_1D_SIZE;
		const max = kind === "3d" ? MAX_CUBE_3D_SIZE : MAX_CUBE_1D_SIZE;
		if (Number.isInteger(size) === false || size < min || size > max) {
			return fail(
				"size-out-of-range",
				`LUT_${kind.toUpperCase()}_SIZE must be an integer in ${min}..${max}, got "${String(size)}".`,
			);
		}
	}

	if (header.dataRows === 0) {
		return fail("empty", "File contains no data rows.");
	}

	if (kind === null || size === null) {
		return fail(
			"missing-size",
			"Data rows are present but neither LUT_1D_SIZE nor LUT_3D_SIZE was declared.",
		);
	}

	const expectedEntries = kind === "1d" ? size : size * size * size;
	const data = new Float32Array(expectedEntries * 3);
	const fill = readData(source, data);

	const badLine = earliestLine(header.firstBadLine, fill.badLine);
	if (badLine !== null) {
		return fail(
			"malformed-row",
			`Line ${badLine} is not three finite numbers.`,
			{ line: badLine },
		);
	}

	if (fill.rows !== expectedEntries) {
		return fail(
			"size-mismatch",
			`LUT_${kind.toUpperCase()}_SIZE ${size} needs ${expectedEntries} rows, found ${fill.rows}.`,
		);
	}

	return {
		ok: true,
		lut: {
			title: header.title,
			kind,
			size,
			domainMin: header.domainMin,
			domainMax: header.domainMax,
			data,
			observedMin: fill.observedMin,
			observedMax: fill.observedMax,
		},
	};
};

// ---------------------------------------------------------------------------
// GPU / shader integration notes — documentation only, no code here.
//
// The shader side needs:
//
//  1. RGB is NOT uploadable. WebGL2 has no `RGB32F`/`RGB16F` sized internal
//     format — only R/RG/RGBA at 16F/32F. Every uploaded cube must therefore be
//     widened to RGBA (`size ** 3 * 4` floats) before `texImage3D`.
//  2. 3D path: `TEXTURE_3D`, `size x size x size`, `texImage3D(..., RGBA16F,
//     RED, FLOAT, rgba)`. The parser's R-fastest ordering already matches the
//     `(x = red, y = green, z = blue)` axis order, so the data can be uploaded
//     verbatim once widened — no transpose. `LINEAR` filtering on `TEXTURE_3D`
//     *is* trilinear, so no manual 8-tap lerp is needed. `RGBA16F` keeps the
//     upload at 2 bytes/component; `RGBA32F` needs `OES_texture_float_linear`
//     for `LINEAR` to work.
//  3. 1D path: a single-row 2D texture (`size x 1`, `LINEAR` horizontally,
//     `NEAREST` vertically) or three separate 1D textures if the consumer needs
//     per-channel control. A `LUT_3D_SIZE 2` file is effectively a 1D table and
//     is usually better served by this path.
//  4. The shader must remap through the domain *before* building the texcoord:
//     `t = (c - domainMin) / (domainMax - domainMin)`. Colours outside the
//     domain must be clamped or rejected deliberately, since a LUT routinely
//     overshoots 0..1 — `observedMin` / `observedMax` are exposed precisely so
//     the UI can warn about that headroom before it reaches a viewer.
//  5. LUT output is unbounded; clamp/tonemap on the consumer side, not here.
// ---------------------------------------------------------------------------
