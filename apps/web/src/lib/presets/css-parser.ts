import type { CSSProperties } from "react";

export function parseCssDeclarations(css: string): CSSProperties {
	const style: Record<string, string> = {};

	for (const declaration of splitDeclarations(css)) {
		const separatorIndex = findPropertySeparator(declaration);
		if (separatorIndex === -1) continue;

		const property = declaration.slice(0, separatorIndex).trim();
		const value = declaration.slice(separatorIndex + 1).trim();
		if (!property || !value) continue;

		style[toReactStyleName(property)] = value;
	}

	return style as CSSProperties;
}

function splitDeclarations(css: string): string[] {
	const declarations: string[] = [];
	let current = "";
	let quote: string | null = null;
	let escaped = false;
	let parenDepth = 0;

	for (const char of css) {
		if (escaped) {
			current += char;
			escaped = false;
			continue;
		}

		if (char === "\\") {
			current += char;
			escaped = true;
			continue;
		}

		if (quote) {
			current += char;
			if (char === quote) quote = null;
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			current += char;
			continue;
		}

		if (char === "(") {
			parenDepth += 1;
			current += char;
			continue;
		}

		if (char === ")") {
			parenDepth = Math.max(0, parenDepth - 1);
			current += char;
			continue;
		}

		if (char === ";" && parenDepth === 0) {
			pushDeclaration(declarations, current);
			current = "";
			continue;
		}

		current += char;
	}

	pushDeclaration(declarations, current);
	return declarations;
}

function pushDeclaration(declarations: string[], declaration: string) {
	const trimmed = declaration.trim();
	if (trimmed) declarations.push(trimmed);
}

function findPropertySeparator(declaration: string): number {
	let quote: string | null = null;
	let escaped = false;
	let parenDepth = 0;

	for (let index = 0; index < declaration.length; index += 1) {
		const char = declaration[index];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (char === "\\") {
			escaped = true;
			continue;
		}

		if (quote) {
			if (char === quote) quote = null;
			continue;
		}

		if (char === '"' || char === "'") {
			quote = char;
			continue;
		}

		if (char === "(") {
			parenDepth += 1;
			continue;
		}

		if (char === ")") {
			parenDepth = Math.max(0, parenDepth - 1);
			continue;
		}

		if (char === ":" && parenDepth === 0) return index;
	}

	return -1;
}

function toReactStyleName(property: string): string {
	return property
		.trim()
		.toLowerCase()
		.replace(/^-ms-/, "ms-")
		.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
