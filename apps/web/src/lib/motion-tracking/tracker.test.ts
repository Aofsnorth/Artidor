import { describe, expect, test } from "bun:test";
import { searchTemplate } from "./tracker";

const IMAGE_SIZE = 64;
const TEMPLATE_SIZE = 8;

function makePattern(): Float32Array {
	const pattern = new Float32Array(TEMPLATE_SIZE * TEMPLATE_SIZE);
	for (let y = 0; y < TEMPLATE_SIZE; y++) {
		for (let x = 0; x < TEMPLATE_SIZE; x++) {
			pattern[y * TEMPLATE_SIZE + x] = (x * 17 + y * 31) % 97;
		}
	}
	return pattern;
}

function normalize(template: Float32Array): Float32Array {
	const mean =
		template.reduce((sum, value) => sum + value, 0) / template.length;
	return template.map((value) => value - mean) as Float32Array;
}

describe("searchTemplate", () => {
	test("keeps the template size instead of growing to the search box", () => {
		const image = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
		const pattern = makePattern();
		const expectedX = 30;
		const expectedY = 20;

		for (let y = 0; y < TEMPLATE_SIZE; y++) {
			for (let x = 0; x < TEMPLATE_SIZE; x++) {
				image[(expectedY + y) * IMAGE_SIZE + (expectedX + x)] =
					pattern[y * TEMPLATE_SIZE + x] ?? 0;
			}
		}

		const result = searchTemplate({
			image,
			imageWidth: IMAGE_SIZE,
			imageHeight: IMAGE_SIZE,
			template: normalize(pattern),
			searchBox: { x: 0, y: 0, width: 48, height: 48 },
			templateSize: TEMPLATE_SIZE,
			templateWidth: 8,
			templateHeight: 8,
		});

		expect(result.box.x).toBe(expectedX);
		expect(result.box.y).toBe(expectedY);
		expect(result.box.width).toBe(8);
		expect(result.box.height).toBe(8);
		expect(result.confidence).toBeGreaterThan(0.9);
	});

	test("returns a bounded correlation score when nothing matches", () => {
		const image = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
		for (let i = 0; i < image.length; i++) {
			image[i] = (i * 13) % 251;
		}
		const result = searchTemplate({
			image,
			imageWidth: IMAGE_SIZE,
			imageHeight: IMAGE_SIZE,
			template: normalize(makePattern()),
			searchBox: { x: 0, y: 0, width: 32, height: 32 },
			templateSize: TEMPLATE_SIZE,
			templateWidth: 8,
			templateHeight: 8,
		});
		expect(result.confidence).toBeGreaterThanOrEqual(0);
		expect(result.confidence).toBeLessThanOrEqual(1);
	});
});
