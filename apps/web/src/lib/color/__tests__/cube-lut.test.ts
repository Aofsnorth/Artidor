import { describe, expect, test } from "bun:test";
import type {
	CubeLut,
	CubeLutError,
	CubeLutErrorReason,
	ParseCubeLutResult,
} from "@/lib/color/cube-lut";
import {
	MAX_CUBE_1D_SIZE,
	MAX_CUBE_3D_SIZE,
	MAX_CUBE_FILE_BYTES,
	estimateCubeBytes,
	parseCubeLut,
} from "@/lib/color/cube-lut";

const expectOk = (result: ParseCubeLutResult): CubeLut => {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error(`expected a LUT, got "${result.error.reason}"`);
	}
	return result.lut;
};

const expectErr = (result: ParseCubeLutResult): CubeLutError => {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error("expected a parse error, got a LUT");
	}
	return result.error;
};

/** R-fastest identity cube text: R moves fastest, then G, then B. */
const identityCube = (size: number): string => {
	const rows: string[] = [];
	const last = size - 1;
	for (let b = 0; b < size; b += 1) {
		for (let g = 0; g < size; g += 1) {
			for (let r = 0; r < size; r += 1) {
				rows.push(`${r / last} ${g / last} ${b / last}`);
			}
		}
	}
	return rows.join("\n");
};

describe("parseCubeLut — valid 1D LUTs", () => {
	test("parses a minimal 2-entry 1D LUT", () => {
		const lut = expectOk(parseCubeLut("LUT_1D_SIZE 2\n0 0 0\n1 1 1"));

		expect(lut.kind).toBe("1d");
		expect(lut.size).toBe(2);
		expect(lut.title).toBeNull();
		expect(lut.data).toBeInstanceOf(Float32Array);
		expect(lut.data.length).toBe(6);
		expect(Array.from(lut.data)).toEqual([0, 0, 0, 1, 1, 1]);
		expect(lut.domainMin).toEqual([0, 0, 0]);
		expect(lut.domainMax).toEqual([1, 1, 1]);
		expect(lut.observedMin).toEqual([0, 0, 0]);
		expect(lut.observedMax).toEqual([1, 1, 1]);
	});

	test("a 1D LUT holds exactly `size` triples, not size^3", () => {
		const lut = expectOk(
			parseCubeLut("LUT_1D_SIZE 4\n0 0 0\n0.2 0.1 0.05\n0.5 0.5 0.5\n1 1 1"),
		);

		expect(lut.kind).toBe("1d");
		expect(lut.size).toBe(4);
		expect(lut.data.length).toBe(12);
		expect(Array.from(lut.data.subarray(3, 6))).toEqual([
			0.20000000298023224, 0.10000000149011612, 0.05000000074505806,
		]);
	});

	test("records values outside the domain without clamping them", () => {
		const lut = expectOk(parseCubeLut("LUT_1D_SIZE 2\n-0.25 0 1.5\n1 1 1"));

		expect(lut.data[0]).toBe(-0.25);
		expect(lut.data[2]).toBe(1.5);
		expect(lut.observedMin).toEqual([-0.25, 0, 1]);
		expect(lut.observedMax).toEqual([1, 1, 1.5]);
	});
});

describe("parseCubeLut — valid 3D LUTs", () => {
	test("parses a minimal 2x2x2 3D LUT", () => {
		const source = `TITLE "Two By Two"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0`;
		const lut = expectOk(parseCubeLut(source));

		expect(lut.kind).toBe("3d");
		expect(lut.size).toBe(2);
		expect(lut.title).toBe("Two By Two");
		expect(lut.data.length).toBe(24);
		expect(lut.observedMin).toEqual([0, 0, 0]);
		expect(lut.observedMax).toEqual([1, 1, 1]);
	});

	test("round-trips the first row into data[0..2]", () => {
		const lut = expectOk(
			parseCubeLut(`LUT_3D_SIZE 2
0.25 0.5 0.75
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1`),
		);

		expect(lut.data[0]).toBe(0.25);
		expect(lut.data[1]).toBe(0.5);
		expect(lut.data[2]).toBe(0.75);
	});

	test("keeps R-fastest ordering so index == (b*size + g)*size + r", () => {
		const lut = expectOk(parseCubeLut(`LUT_3D_SIZE 2\n${identityCube(2)}`));
		const at = (r: number, g: number, b: number): number[] => {
			const base = ((b * 2 + g) * 2 + r) * 3;
			return [lut.data[base], lut.data[base + 1], lut.data[base + 2]];
		};

		expect(at(0, 0, 0)).toEqual([0, 0, 0]);
		expect(at(1, 0, 0)).toEqual([1, 0, 0]);
		expect(at(0, 1, 0)).toEqual([0, 1, 0]);
		expect(at(0, 0, 1)).toEqual([0, 0, 1]);
		expect(at(1, 1, 1)).toEqual([1, 1, 1]);
		// The first 4 rows are all of the B=0 slice: blue only rises at row 5.
		expect(lut.data[2]).toBe(0);
		expect(lut.data[11]).toBe(0);
		expect(lut.data[12]).toBe(0);
		expect(lut.data[14]).toBe(1);
	});

	test("accepts LUT_3D_SIZE 33 (an odd, non-power-of-two grid)", () => {
		const lut = expectOk(parseCubeLut(`LUT_3D_SIZE 33\n${identityCube(33)}`));

		expect(lut.kind).toBe("3d");
		expect(lut.size).toBe(33);
		expect(lut.data.length).toBe(33 ** 3 * 3);
		// Last entry of an R-fastest cube is the pure-white corner.
		const last = lut.data.length - 1;
		expect(lut.data[last - 2]).toBe(1);
		expect(lut.data[last - 1]).toBe(1);
		expect(lut.data[last]).toBe(1);
	});

	test("accepts the largest supported 3D grid", () => {
		const lut = expectOk(
			parseCubeLut(
				`LUT_3D_SIZE ${MAX_CUBE_3D_SIZE}\n${identityCube(MAX_CUBE_3D_SIZE)}`,
			),
		);

		expect(lut.size).toBe(64);
		expect(lut.data.length).toBe(64 ** 3 * 3);
		expect(lut.observedMax).toEqual([1, 1, 1]);
	});

	test("accepts the largest supported 1D grid", () => {
		const rows: string[] = [];
		for (let i = 0; i < MAX_CUBE_1D_SIZE; i += 1) {
			rows.push(`${i} ${i} ${i}`);
		}
		const lut = expectOk(
			parseCubeLut(`LUT_1D_SIZE ${MAX_CUBE_1D_SIZE}\n${rows.join("\n")}`),
		);

		expect(lut.kind).toBe("1d");
		expect(lut.size).toBe(4096);
		expect(lut.data.length).toBe(4096 * 3);
		expect(lut.observedMax[0]).toBe(4095);
	});
});

describe("parseCubeLut — keywords", () => {
	test("defaults the domain to 0 0 0 / 1 1 1", () => {
		const lut = expectOk(parseCubeLut(`LUT_1D_SIZE 2\n0 0 0\n1 1 1`));

		expect(lut.domainMin).toEqual([0, 0, 0]);
		expect(lut.domainMax).toEqual([1, 1, 1]);
	});

	test("honours DOMAIN_MIN and DOMAIN_MAX", () => {
		const lut = expectOk(
			parseCubeLut(`LUT_1D_SIZE 2
DOMAIN_MIN -0.5 0 0.1
DOMAIN_MAX 1.5 1 0.9
0 0 0
1 1 1`),
		);

		expect(lut.domainMin).toEqual([-0.5, 0, 0.10000000149011612]);
		expect(lut.domainMax).toEqual([1.5, 1, 0.8999999761581421]);
	});

	test("keeps the default when a DOMAIN line is unusable", () => {
		const lut = expectOk(
			parseCubeLut(`LUT_1D_SIZE 2
DOMAIN_MIN nonsense 0 0
DOMAIN_MAX 1
0 0 0
1 1 1`),
		);

		expect(lut.domainMin).toEqual([0, 0, 0]);
		expect(lut.domainMax).toEqual([1, 1, 1]);
	});

	test("is order-independent: size and domain may follow the data", () => {
		const lut = expectOk(
			parseCubeLut(`0 0 0
1 1 1
LUT_1D_SIZE 2
TITLE "Late"
DOMAIN_MIN 0 0 0
DOMAIN_MAX 2 2 2`),
		);

		expect(lut.kind).toBe("1d");
		expect(lut.size).toBe(2);
		expect(lut.title).toBe("Late");
		expect(lut.domainMax).toEqual([2, 2, 2]);
		expect(lut.data.length).toBe(6);
	});

	test("does not treat LUT_3D_SIZEX as a size declaration", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0 0 0
LUT_3D_SIZEX 2
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(3);
	});

	test("reports missing-size before it looks at individual rows", () => {
		// The unparseable row at line 1 is only worth mentioning once the file
		// has told us what size it thinks it is.
		const error = expectErr(parseCubeLut("LUT_3D_SIZEX 2\n0 0 0\n"));

		expect(error.reason).toBe("missing-size");
	});
});

describe("parseCubeLut — TITLE", () => {
	test("captures a quoted title", () => {
		const lut = expectOk(
			parseCubeLut(`TITLE "Warm Punch"
LUT_1D_SIZE 2
0 0 0
1 1 1`),
		);

		expect(lut.title).toBe("Warm Punch");
	});

	test("captures an unquoted title", () => {
		const lut = expectOk(
			parseCubeLut(`TITLE Warm Punch
LUT_1D_SIZE 2
0 0 0
1 1 1`),
		);

		expect(lut.title).toBe("Warm Punch");
	});

	test("tolerates a missing closing quote", () => {
		const lut = expectOk(
			parseCubeLut(`TITLE "Unterminated
LUT_1D_SIZE 2
0 0 0
1 1 1`),
		);

		expect(lut.title).toBe("Unterminated");
	});

	test("tolerates stray closing quotes and trims trailing space", () => {
		const lut = expectOk(
			parseCubeLut(`TITLE   Spaced Out"  \t
LUT_1D_SIZE 2
0 0 0
1 1 1`),
		);

		expect(lut.title).toBe("Spaced Out");
	});

	test("an empty title is null, not an empty string", () => {
		const lut = expectOk(
			parseCubeLut(`TITLE ""
LUT_1D_SIZE 2
0 0 0
1 1 1`),
		);

		expect(lut.title).toBeNull();
	});

	test("a bare TITLE keyword does not crash", () => {
		const lut = expectOk(
			parseCubeLut(`TITLE
LUT_1D_SIZE 2
0 0 0
1 1 1`),
		);

		expect(lut.title).toBeNull();
	});
});

describe("parseCubeLut — comments, blanks and whitespace", () => {
	test("strips comments and blank lines", () => {
		const lut = expectOk(
			parseCubeLut(`# Created by DaVinci Resolve
#VERSION 1

LUT_3D_SIZE 2

   # indented comment
0.0 0.0 0.0

1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0

# tail comment
1.0 1.0 1.0
`),
		);

		expect(lut.size).toBe(2);
		expect(lut.data.length).toBe(24);
		expect(lut.data[21]).toBe(1);
	});

	test("a comment marker inside leading whitespace still counts as a comment", () => {
		const lut = expectOk(parseCubeLut("\t  # hi\nLUT_1D_SIZE 2\n0 0 0\n1 1 1"));

		expect(lut.size).toBe(2);
	});

	test("tolerates a trailing comment on a data row", () => {
		const lut = expectOk(
			parseCubeLut(`LUT_1D_SIZE 2
0 0 0    # black
1 1 1	# white`),
		);

		expect(Array.from(lut.data)).toEqual([0, 0, 0, 1, 1, 1]);
	});

	test("tolerates tabs, leading and trailing whitespace on every line", () => {
		const lut = expectOk(
			parseCubeLut("\tLUT_1D_SIZE\t2  \n\t 0\t0\t0 \t\n 1 1 1  \n"),
		);

		expect(lut.size).toBe(2);
		expect(Array.from(lut.data)).toEqual([0, 0, 0, 1, 1, 1]);
	});

	test("handles CRLF line endings without leaking CR into the last field", () => {
		const source = `TITLE "CRLF"\r\nLUT_1D_SIZE 2\r\n0.5 0.25 0\r\n1 1 1\r\n`;

		// If the CR were read as a fourth token this would be `malformed-row`
		// rather than a clean parse.
		const lut = expectOk(parseCubeLut(source));
		expect(lut.data.length).toBe(6);
	});

	test("a CRLF file with no trailing newline still parses", () => {
		const lut = expectOk(parseCubeLut(`LUT_1D_SIZE 2\r\n0.5 0.5 0.5\r\n1 1 1`));

		expect(Array.from(lut.data)).toEqual([0.5, 0.5, 0.5, 1, 1, 1]);
	});

	test("a CRLF 3D LUT round-trips", () => {
		const lut = expectOk(
			parseCubeLut(
				`LUT_3D_SIZE 2\r\n${identityCube(2).replaceAll("\n", "\r\n")}\r\n`,
			),
		);

		expect(lut.kind).toBe("3d");
		expect(lut.data.length).toBe(24);
	});

	test("strips a UTF-8 BOM", () => {
		const lut = expectOk(
			parseCubeLut('\uFEFFTITLE "BOM"\nLUT_1D_SIZE 2\n0 0 0\n1 1 1'),
		);

		expect(lut.title).toBe("BOM");
		expect(lut.size).toBe(2);
	});

	test("a BOM before a CRLF file does not corrupt the first keyword", () => {
		const lut = expectOk(
			parseCubeLut(`\uFEFFLUT_3D_SIZE 2\r\n${identityCube(2)}\r\n`),
		);

		expect(lut.kind).toBe("3d");
		expect(lut.data.length).toBe(24);
	});
});

describe("parseCubeLut — number grammar", () => {
	test("accepts exponents, signs, bare dots and leading dots", () => {
		const lut = expectOk(
			parseCubeLut(`LUT_1D_SIZE 2
+.5 -0.25 1e-3
-1E+2 .5 5.`),
		);

		expect(lut.data[0]).toBeCloseTo(0.5, 6);
		expect(lut.data[1]).toBeCloseTo(-0.25, 6);
		expect(lut.data[2]).toBeCloseTo(0.001, 6);
		expect(lut.data[3]).toBeCloseTo(-100, 6);
		expect(lut.data[4]).toBeCloseTo(0.5, 6);
		expect(lut.data[5]).toBeCloseTo(5, 6);
	});

	test("rejects a non-numeric row and reports its 1-based line", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0 0 0
1 1 nope`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(3);
		expect(error.message).toContain("3");
	});

	test("rejects a row with only two numbers", () => {
		const error = expectErr(
			parseCubeLut(`LUT_3D_SIZE 2
0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(2);
	});

	test("rejects a row with four numbers", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0 0 0 0
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(2);
	});

	test("rejects trailing garbage after a complete triple", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0 0 0abc
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(2);
	});

	test("rejects a hex literal that Number() would happily coerce", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0x10 0 0
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(2);
	});

	test("rejects NaN rather than coercing it", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0.5 NaN 0.5
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(2);
	});

	test("rejects a NaN in the red position, where it opens the line", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
NaN 0.5 0.5
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(2);
	});

	test("rejects Infinity and -Infinity", () => {
		for (const literal of ["Infinity", "-Infinity", "inf", "-inf"]) {
			const error = expectErr(
				parseCubeLut(`LUT_1D_SIZE 2
0.5 0.5 ${literal}
1 1 1`),
			);
			expect(error.reason, literal).toBe("malformed-row");
			expect(error.line, literal).toBe(2);
		}
	});

	test("rejects a literal that overflows float32", () => {
		for (const literal of ["1e39", "-1e39", "1e999"]) {
			const error = expectErr(
				parseCubeLut(`LUT_1D_SIZE 2
0.5 0.5 ${literal}
1 1 1`),
			);
			expect(error.reason, literal).toBe("malformed-row");
		}
	});

	test("keeps a value that is only slightly beyond float32 range", () => {
		const lut = expectOk(parseCubeLut("LUT_1D_SIZE 2\n1e30 0 0\n0 0 0"));

		// float32 tops out near 3.4e38, so 1e30 survives the store intact.
		expect(lut.data[0]).toBe(Math.fround(1e30));
		expect(lut.observedMax[0]).toBe(Math.fround(1e30));
	});

	test("reports the earliest bad line when several are wrong", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 2
0 0 0
bad
1 1 1
also bad`),
		);

		expect(error.reason).toBe("malformed-row");
		expect(error.line).toBe(3);
	});
});

describe("parseCubeLut — errors", () => {
	const cases: Array<[CubeLutErrorReason, string]> = [
		["empty", ""],
		["empty", "\n\n   \n# only comments\n"],
		["empty", 'TITLE "Header Only"\nLUT_3D_SIZE 2\n'],
		["missing-size", "0 0 0\n1 1 1\n"],
		["missing-size", "0 0 0\n"],
		["size-out-of-range", `LUT_3D_SIZE 1\n0 0 0\n`],
		["size-out-of-range", `LUT_3D_SIZE 65\n0 0 0\n`],
		["size-out-of-range", `LUT_3D_SIZE 0\n0 0 0\n`],
		["size-out-of-range", `LUT_3D_SIZE 2.5\n0 0 0\n`],
		["size-out-of-range", `LUT_3D_SIZE abc\n0 0 0\n`],
		["size-out-of-range", `LUT_3D_SIZE\n0 0 0\n`],
		["size-out-of-range", `LUT_1D_SIZE 4097\n0 0 0\n`],
		["conflicting-size", `LUT_1D_SIZE 2\nLUT_3D_SIZE 2\n0 0 0\n`],
		["size-mismatch", `LUT_3D_SIZE 2\n0 0 0\n`],
		[
			"size-mismatch",
			`LUT_3D_SIZE 2\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n0 0 0\n`,
		],
		["size-mismatch", `LUT_1D_SIZE 4\n0 0 0\n1 1 1\n`],
	];

	for (const [reason, source] of cases) {
		test(`${reason} <- ${JSON.stringify(source)}`, () => {
			expect(expectErr(parseCubeLut(source)).reason).toBe(reason);
		});
	}

	test("an out-of-range size beats an otherwise-empty body", () => {
		expect(expectErr(parseCubeLut("LUT_3D_SIZE 65\n")).reason).toBe(
			"size-out-of-range",
		);
	});

	test("a declared size with no rows is empty, not a mismatch", () => {
		const error = expectErr(parseCubeLut("LUT_1D_SIZE 2\n"));

		expect(error.reason).toBe("empty");
	});

	test("size-mismatch reports the expected and actual counts", () => {
		const error = expectErr(parseCubeLut("LUT_1D_SIZE 4\n0 0 0\n1 1 1\n"));

		expect(error.message).toContain("4");
		expect(error.message).toContain("2");
	});

	test("malformed-row beats size-mismatch", () => {
		const error = expectErr(
			parseCubeLut(`LUT_1D_SIZE 4
0 0 0
1 1 1
oops
1 1 1`),
		);

		expect(error.reason).toBe("malformed-row");
	});

	test("every reason carries a non-empty message", () => {
		for (const [, source] of cases) {
			expect(expectErr(parseCubeLut(source)).message.length).toBeGreaterThan(0);
		}
	});

	test("never throws on adversarial input", () => {
		const nasty = [
			"\u0000\u0001\u0002",
			'"\u0000"',
			"1".repeat(10_000),
			"0 0 0 ".repeat(5_000),
			"#".repeat(1_000),
			"\t".repeat(1_000),
			`LUT_3D_SIZE 2\n${"\\".repeat(500)}`,
			"LUT_3D_SIZE 2\n0 0 0\n\uFEFF0 0 0",
			`LUT_1D_SIZE 2\n0 0 0\n${"0 0 0\n".repeat(100)}1 1 1`,
		];

		for (const source of nasty) {
			const result = parseCubeLut(source);
			expect(typeof result.ok).toBe("boolean");
			if (!result.ok) {
				expect(result.error.message.length).toBeGreaterThan(0);
			}
		}
	});
});

describe("parseCubeLut — too-large", () => {
	test("rejects input over the caller-supplied cap and reports the limit", () => {
		const source = `LUT_1D_SIZE 2\n0 0 0\n1 1 1`;
		const error = expectErr(parseCubeLut(source, { maxBytes: 8 }));

		expect(error.reason).toBe("too-large");
		expect(error.limit).toBe(8);
		expect(error.message).toContain("8");
	});

	test("accepts input exactly at the cap", () => {
		const source = `LUT_1D_SIZE 2\n0 0 0\n1 1 1`;

		expect(parseCubeLut(source, { maxBytes: source.length }).ok).toBe(true);
	});

	test("the size cap is checked before anything else", () => {
		// This body would otherwise be `size-out-of-range`.
		const error = expectErr(parseCubeLut("LUT_3D_SIZE 999\n", { maxBytes: 4 }));

		expect(error.reason).toBe("too-large");
	});

	test("the default cap leaves the largest legal 3D LUT comfortably inside", () => {
		expect(
			estimateCubeBytes({ kind: "3d", size: MAX_CUBE_3D_SIZE }),
		).toBeLessThan(MAX_CUBE_FILE_BYTES);
		expect(
			estimateCubeBytes({ kind: "1d", size: MAX_CUBE_1D_SIZE }),
		).toBeLessThan(MAX_CUBE_FILE_BYTES);
	});
});

describe("estimateCubeBytes", () => {
	test("1D scales linearly in size", () => {
		expect(estimateCubeBytes({ kind: "1d", size: 0 })).toBe(128);
		expect(estimateCubeBytes({ kind: "1d", size: 2 })).toBe(192);
		expect(estimateCubeBytes({ kind: "1d", size: 1024 })).toBe(32_896);
	});

	test("3D scales with size^3", () => {
		expect(estimateCubeBytes({ kind: "3d", size: 2 })).toBe(384);
		expect(estimateCubeBytes({ kind: "3d", size: 3 })).toBe(992);
		expect(estimateCubeBytes({ kind: "3d", size: 33 })).toBe(1_150_112);
	});

	test("a 64^3 cube estimates to roughly 8.4 MB of text", () => {
		expect(estimateCubeBytes({ kind: "3d", size: 64 })).toBe(8_388_736);
	});

	test("3D estimates grow as size^2 relative to 1D once the header is removed", () => {
		for (const size of [2, 4, 8]) {
			const oneD = estimateCubeBytes({ kind: "1d", size }) - 128;
			const threeD = estimateCubeBytes({ kind: "3d", size }) - 128;
			expect(threeD / oneD, `${size}^2`).toBe(size * size);
		}
	});

	test("returns 0 for a size that is not a non-negative integer", () => {
		for (const size of [-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(estimateCubeBytes({ kind: "3d", size }), String(size)).toBe(0);
		}
	});

	test("the estimate comfortably covers a real generated file", () => {
		for (const size of [2, 3, 5]) {
			const source = `LUT_3D_SIZE ${size}\n${identityCube(size)}\n`;
			expect(
				estimateCubeBytes({ kind: "3d", size }),
				`${size}^3`,
			).toBeGreaterThan(source.length);
		}
	});
});
