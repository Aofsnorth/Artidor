/**
 * Parse a .cube LUT file (Adobe Cube format) and produce a 3D lookup table.
 *
 * Supports LUT_3D_SIZE 2-64 and TITLE/DOMAIN_MIN/DOMAIN_MAX/LUT_1D_SIZE/0.0/0.0 0.0/0.5 etc.
 */
export interface ParsedLut {
	title: string;
	size: number;
	domainMin: [number, number, number];
	domainMax: [number, number, number];
	data: Float32Array;
}

export function parseCubeLut({ content }: { content: string }): ParsedLut | null {
	const lines = content.split(/\r?\n/);
	let size = 0;
	let title = "";
	const domainMin: [number, number, number] = [0, 0, 0];
	const domainMax: [number, number, number] = [1, 1, 1];
	const values: number[] = [];

	for (const raw of lines) {
		const line = raw.trim();
		if (line.length === 0 || line.startsWith("#")) continue;

		if (line.startsWith("TITLE")) {
			const m = line.match(/TITLE\s+"?([^"]+)"?/);
			if (m) title = m[1];
			continue;
		}
		if (line.startsWith("LUT_3D_SIZE")) {
			const parts = line.split(/\s+/);
			size = Number.parseInt(parts[1] ?? "0", 10);
			continue;
		}
		if (line.startsWith("DOMAIN_MIN")) {
			const parts = line.split(/\s+/).slice(1).map(Number);
			if (parts.length === 3) {
				domainMin[0] = parts[0];
				domainMin[1] = parts[1];
				domainMin[2] = parts[2];
			}
			continue;
		}
		if (line.startsWith("DOMAIN_MAX")) {
			const parts = line.split(/\s+/).slice(1).map(Number);
			if (parts.length === 3) {
				domainMax[0] = parts[0];
				domainMax[1] = parts[1];
				domainMax[2] = parts[2];
			}
			continue;
		}
		if (line.startsWith("LUT_1D_SIZE") || line.startsWith("1D_")) {
			// Skip 1D LUT entries (not supported here)
			continue;
		}

		const parts = line.split(/\s+/);
		if (parts.length >= 3) {
			const r = Number.parseFloat(parts[0]);
			const g = Number.parseFloat(parts[1]);
			const b = Number.parseFloat(parts[2]);
			if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
				values.push(r, g, b);
			}
		}
	}

	if (size <= 0 || values.length !== size * size * size * 3) {
		return null;
	}

	return {
		title,
		size,
		domainMin,
		domainMax,
		data: new Float32Array(values),
	};
}

/**
 * Sample a 3D LUT with trilinear interpolation.
 */
export function sampleLut({
	lut,
	r,
	g,
	b,
}: {
	lut: ParsedLut;
	r: number;
	g: number;
	b: number;
}): { r: number; g: number; b: number } {
	const { size, domainMin, domainMax, data } = lut;
	// Map [0,1] to domain
	const dr = domainMax[0] - domainMin[0];
	const dg = domainMax[1] - domainMin[1];
	const db = domainMax[2] - domainMin[2];
	const fr = Math.max(0, Math.min(1, (r - domainMin[0]) / dr));
	const fg = Math.max(0, Math.min(1, (g - domainMin[1]) / dg));
	const fb = Math.max(0, Math.min(1, (b - domainMin[2]) / db));

	// Convert to grid coordinates
	const x = fr * (size - 1);
	const y = fg * (size - 1);
	const z = fb * (size - 1);
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const z0 = Math.floor(z);
	const x1 = Math.min(size - 1, x0 + 1);
	const y1 = Math.min(size - 1, y0 + 1);
	const z1 = Math.min(size - 1, z0 + 1);
	const tx = x - x0;
	const ty = y - y0;
	const tz = z - z0;

	const idx = (xx: number, yy: number, zz: number) => {
		const i = (zz * size * size + yy * size + xx) * 3;
		return [data[i], data[i + 1], data[i + 2]];
	};

	const c000 = idx(x0, y0, z0);
	const c100 = idx(x1, y0, z0);
	const c010 = idx(x0, y1, z0);
	const c110 = idx(x1, y1, z0);
	const c001 = idx(x0, y0, z1);
	const c101 = idx(x1, y0, z1);
	const c011 = idx(x0, y1, z1);
	const c111 = idx(x1, y1, z1);

	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

	const r0 = lerp(lerp(c000[0], c100[0], tx), lerp(c010[0], c110[0], tx), ty);
	const g0 = lerp(lerp(c000[1], c100[1], tx), lerp(c010[1], c110[1], tx), ty);
	const b0 = lerp(lerp(c000[2], c100[2], tx), lerp(c010[2], c110[2], tx), ty);

	const r1 = lerp(lerp(c001[0], c101[0], tx), lerp(c011[0], c111[0], tx), ty);
	const g1 = lerp(lerp(c001[1], c101[1], tx), lerp(c011[1], c111[1], tx), ty);
	const b1 = lerp(lerp(c001[2], c101[2], tx), lerp(c011[2], c111[2], tx), ty);

	return {
		r: lerp(r0, r1, tz),
		g: lerp(g0, g1, tz),
		b: lerp(b0, b1, tz),
	};
}
