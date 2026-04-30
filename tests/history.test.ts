import {vi, describe, it, expect, beforeEach, beforeAll} from "vitest";
import {
	getSessions,
	saveSession,
	deleteSession,
	clearHistory,
	getSession,
} from "../lib/history";
import type {ImageAnalysisType, CopyWritingType} from "../lib/definitions";

const storage: Record<string, string> = {};
let quotaLimit = Infinity;

beforeAll(() => {
	(globalThis as Record<string, unknown>).window = globalThis;
	Object.defineProperty(globalThis, "localStorage", {
		value: {
			getItem: (key: string) => storage[key] ?? null,
			setItem: (key: string, value: string) => {
				if (value.length > quotaLimit) {
					throw new Error("QuotaExceededError: Setting the value exceeded the quota.");
				}
				storage[key] = value;
			},
			removeItem: (key: string) => {
				delete storage[key];
			},
		},
		configurable: true,
	});
});

beforeEach(() => {
	Object.keys(storage).forEach((k) => delete storage[k]);
	quotaLimit = Infinity;
});

const mockAnalysis: ImageAnalysisType = {
	core_attributes: {
		subject: "test",
		orientation: "landscape",
		composition: "centered",
	},
	technical_specs: {
		medium: "oil",
		surface: "canvas",
		textures: ["smooth"],
		visible_tools: ["brush"],
	},
	visual_identity: {
		primary_colors: ["blue"],
		lighting_vibe: "soft",
		artistic_style: "impressionist",
	},
	marketing_hooks: {
		emotional_keywords: ["calm"],
		symbolism: "peace",
		suggested_placement: ["living room"],
		unique_handcrafted_details: "hand-painted",
	},
};

const mockCopy: CopyWritingType = {
	titles: {
		option1: "Title 1",
		option2: "Title 2",
		option3: "Title 3",
	},
	tags: ["art", "painting"],
	description: "A beautiful painting.",
};

describe("history", () => {
	beforeEach(() => {
		clearHistory();
	});

	it("should start empty", () => {
		expect(getSessions()).toEqual([]);
	});

	it("should save and retrieve a session", () => {
		const session = saveSession({
			thumbnail: "data:image/png;base64,abc",
			analysis: mockAnalysis,
			copy: mockCopy,
		});
		expect(session.id).toBeDefined();
		expect(getSession(session.id)).toEqual(session);
	});

	it("should list sessions newest first", () => {
		const s1 = saveSession({thumbnail: "a", analysis: mockAnalysis, copy: mockCopy});
		const s2 = saveSession({thumbnail: "b", analysis: mockAnalysis, copy: mockCopy});
		const sessions = getSessions();
		expect(sessions[0].id).toBe(s2.id);
		expect(sessions[1].id).toBe(s1.id);
	});

	it("should delete a session", () => {
		const s1 = saveSession({thumbnail: "a", analysis: mockAnalysis, copy: mockCopy});
		deleteSession(s1.id);
		expect(getSession(s1.id)).toBeNull();
	});

	it("should evict oldest after 20 sessions (LRU)", () => {
		let tick = 1000;
		vi.spyOn(Date, "now").mockImplementation(() => {
			return tick++;
		});
		const sessions: string[] = [];
		for (let i = 0; i < 22; i++) {
			const s = saveSession({thumbnail: String(i), analysis: mockAnalysis, copy: mockCopy});
			sessions.push(s.id);
		}
		const stored = getSessions();
		expect(stored.length).toBe(20);
		expect(stored.some((s) => s.id === sessions[0])).toBe(false);
		expect(stored.some((s) => s.id === sessions[1])).toBe(false);
		vi.restoreAllMocks();
	});

	it("should throw when thumbnails exceed localStorage quota", () => {
		quotaLimit = 100_000;
		const largeThumbnail = "data:image/png;base64," + "a".repeat(200_000);
		expect(() => {
			saveSession({thumbnail: largeThumbnail, analysis: mockAnalysis, copy: mockCopy});
		}).toThrow("QuotaExceededError");
	});
});
