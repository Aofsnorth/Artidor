import { describe, expect, test } from "bun:test";
import { getEffectiveTransform, isValidParentChain } from "./parenting";
import type { SceneTracks, TimelineElement } from "./types";

const IDENTITY_TRANSFORM = {
	scaleX: 1,
	scaleY: 1,
	position: { x: 0, y: 0 },
	rotate: 0,
};

function buildElement({
	id,
	parentId,
	positionX = 0,
}: {
	id: string;
	parentId?: string;
	positionX?: number;
}): TimelineElement {
	return {
		id,
		type: "text",
		name: id,
		content: id,
		startTime: 0,
		duration: 120_000,
		trimStart: 0,
		trimEnd: 0,
		parentId,
		transform: {
			...IDENTITY_TRANSFORM,
			position: { x: positionX, y: 0 },
		},
	} as never;
}

function buildTracks(elements: TimelineElement[]): SceneTracks {
	return {
		overlay: [],
		main: {
			id: "main",
			name: "Main",
			type: "video",
			elements,
			muted: false,
			hidden: false,
		},
		overlayAfter: [],
		audio: [],
	};
}

describe("getEffectiveTransform parenting", () => {
	test("composes every ancestor in a linear chain", () => {
		const tracks = buildTracks([
			buildElement({ id: "child", parentId: "parent", positionX: 10 }),
			buildElement({ id: "parent", parentId: "grandparent", positionX: 5 }),
			buildElement({ id: "grandparent", positionX: 100 }),
		]);

		const transform = getEffectiveTransform({
			element: tracks.main.elements[0],
			tracks,
		});

		expect(transform.position).toEqual({ x: 115, y: 0 });
	});

	test("stops at a cycle instead of recursing forever", () => {
		const tracks = buildTracks([
			buildElement({ id: "a", parentId: "b", positionX: 1 }),
			buildElement({ id: "b", parentId: "a", positionX: 2 }),
		]);

		const transform = getEffectiveTransform({
			element: tracks.main.elements[0],
			tracks,
		});

		expect(transform.position).toEqual({ x: 3, y: 0 });
	});

	test("ignores a self-parent link", () => {
		const selfParent = buildElement({
			id: "self",
			parentId: "self",
			positionX: 7,
		});
		const tracks = buildTracks([selfParent]);

		const transform = getEffectiveTransform({ element: selfParent, tracks });

		expect(transform.position).toEqual({ x: 7, y: 0 });
	});
});

describe("isValidParentChain", () => {
	test("accepts an acyclic chain", () => {
		const tracks = buildTracks([
			buildElement({ id: "a" }),
			buildElement({ id: "b", parentId: "a" }),
			buildElement({ id: "c", parentId: "b" }),
			buildElement({ id: "d" }),
		]);

		expect(
			isValidParentChain({
				element: tracks.main.elements[3],
				tracks,
				newParentId: "c",
			}),
		).toBe(true);
	});

	test("rejects a direct self-parent link", () => {
		const tracks = buildTracks([buildElement({ id: "a" })]);

		expect(
			isValidParentChain({
				element: tracks.main.elements[0],
				tracks,
				newParentId: "a",
			}),
		).toBe(false);
	});

	test("rejects a chain that would close the loop", () => {
		const tracks = buildTracks([
			buildElement({ id: "a" }),
			buildElement({ id: "b", parentId: "a" }),
			buildElement({ id: "c", parentId: "b" }),
		]);

		expect(
			isValidParentChain({
				element: tracks.main.elements[0],
				tracks,
				newParentId: "c",
			}),
		).toBe(false);
	});

	test("rejects an existing cycle reached indirectly", () => {
		const tracks = buildTracks([
			buildElement({ id: "a" }),
			buildElement({ id: "b", parentId: "c" }),
			buildElement({ id: "c", parentId: "b" }),
		]);

		expect(
			isValidParentChain({
				element: tracks.main.elements[0],
				tracks,
				newParentId: "b",
			}),
		).toBe(false);
	});
});
