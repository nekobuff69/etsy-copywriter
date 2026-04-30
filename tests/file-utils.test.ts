import { describe, it, expect, beforeAll } from "vitest";
import { fileToDataUrl, createThumbnail } from "../lib/file-utils";

beforeAll(() => {
	(globalThis as unknown as Record<string, unknown>).FileReader = class MockFileReader {
		result: string | null = null;
		onload: (() => void) | null = null;
		onerror: ((err: Error) => void) | null = null;

		readAsDataURL() {
			Promise.resolve().then(() => {
				this.result = "data:image/png;base64,mockdata";
				this.onload?.();
			});
		}
	};

	(globalThis as unknown as Record<string, unknown>).Image = class MockImage {
		width = 800;
		height = 600;
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;
		src = "";

		constructor() {
			Promise.resolve().then(() => this.onload?.());
		}
	};

	let objectUrlCounter = 0;
	(globalThis as unknown as Record<string, unknown>).URL = {
		createObjectURL: () => `blob:mock-${++objectUrlCounter}`,
		revokeObjectURL: () => {},
	};

	(globalThis as unknown as Record<string, unknown>).document = {
		createElement: (tagName: string) => {
			if (tagName === "canvas") {
				return {
					width: 0,
					height: 0,
					getContext: () => ({
						drawImage: () => {},
					}),
					toDataURL: () =>
						"data:image/jpeg;base64,smallthumb",
				};
			}
			throw new Error(`Unexpected element: ${tagName}`);
		},
	};
});

describe("fileToDataUrl", () => {
	it("resolves with a data URL", async () => {
		const file = new File(["test"], "image.png", { type: "image/png" });
		const url = await fileToDataUrl(file);
		expect(url).toBe("data:image/png;base64,mockdata");
	});
});

describe("createThumbnail", () => {
	it("resolves with a JPEG data URL", async () => {
		const file = new File(["test"], "image.png", { type: "image/png" });
		const url = await createThumbnail(file);
		expect(url).toBe("data:image/jpeg;base64,smallthumb");
	});
});
