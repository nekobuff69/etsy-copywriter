import {vi, describe, it, expect, beforeEach, beforeAll} from "vitest";
import {
	getSessions,
	saveSession,
	deleteSession,
	clearHistory,
	getSession,
	groupSessionsByImageHash,
	groupSessionsByImage,
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

	describe("saveSession with new fields", () => {
		it("should store imageHash when provided", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
				imageHash: "abc123",
			});
			expect(session.imageHash).toBe("abc123");
		});

		it("should store visionModel and copyModel when provided", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
				visionModel: "qwen/qwen3-vl-8b-instruct",
				copyModel: "qwen/qwen3-vl-30b-a3b-instruct",
			});
			expect(session.visionModel).toBe("qwen/qwen3-vl-8b-instruct");
			expect(session.copyModel).toBe("qwen/qwen3-vl-30b-a3b-instruct");
		});

		it("should store baseURL and providerLabel when provided", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
				baseURL: "https://openrouter.ai/api/v1",
				providerLabel: "openrouter",
			});
			expect(session.baseURL).toBe("https://openrouter.ai/api/v1");
			expect(session.providerLabel).toBe("openrouter");
		});

		it("should allow optional new fields to be omitted (backward compat)", () => {
			const session = saveSession({
				thumbnail: "thumb",
				analysis: mockAnalysis,
				copy: mockCopy,
			});
			expect(session.imageHash).toBeUndefined();
			expect(session.visionModel).toBeUndefined();
			expect(session.copyModel).toBeUndefined();
		});
	});

	describe("groupSessionsByImage", () => {
		it("should return enriched groups sorted by latestDate desc", () => {
			let tick = 1000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash2" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			expect(groups.length).toBe(2);
			// Sorted by latestDate desc — hash2 has the newest session (tick=1002)
			expect(groups[0].imageHash).toBe("hash2");
			expect(groups[1].imageHash).toBe("hash1");
		});

		it("should set imageHash to null for solo groups", () => {
			let tick = 5000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "solo-thumb", analysis: mockAnalysis, copy: mockCopy });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			expect(groups.length).toBe(1);
			expect(groups[0].imageHash).toBeNull();
			expect(groups[0].thumbnail).toBe("solo-thumb");
			expect(groups[0].sessions.length).toBe(1);
		});

		it("should return empty array for no sessions", () => {
			const groups = groupSessionsByImage([]);
			expect(groups).toEqual([]);
		});

		it("should use first available thumbnail for group", () => {
			saveSession({ thumbnail: "", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "thumb-data", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });

			const groups = groupSessionsByImage(getSessions());
			expect(groups[0].thumbnail).toBe("thumb-data");
		});

		it("should compute correct latestDate from sessions", () => {
			let tick = 3000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			expect(groups[0].latestDate).toBe(3005);
			expect(groups[0].sessions.length).toBe(3);
		});
	});

	describe("groupSessionsByImageHash", () => {
		it("should group sessions with the same imageHash", () => {
			let tick = 7000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash1" });
			saveSession({ thumbnail: "c", analysis: mockAnalysis, copy: mockCopy, imageHash: "hash2" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImageHash(getSessions());
			expect(groups.size).toBe(2);
			expect(groups.get("hash1")?.length).toBe(2);
			expect(groups.get("hash2")?.length).toBe(1);
		});

		it("should treat sessions without imageHash as solo groups", () => {
			let tick = 8000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy }); // no hash
			saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy }); // no hash
			vi.restoreAllMocks();

			const groups = groupSessionsByImageHash(getSessions());
			expect(groups.size).toBe(2);
		});

		it("should return an empty map for no sessions", () => {
			const groups = groupSessionsByImageHash([]);
			expect(groups.size).toBe(0);
		});
	});

	describe("groupSessionsByImage edge cases", () => {
		it("should never produce a group with an empty sessions array", () => {
			let tick = 9000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			const s1 = saveSession({ thumbnail: "a", analysis: mockAnalysis, copy: mockCopy, imageHash: "h1" });
			const s2 = saveSession({ thumbnail: "b", analysis: mockAnalysis, copy: mockCopy, imageHash: "h1" });
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			for (const g of groups) {
				expect(g.sessions.length).toBeGreaterThan(0);
			}

			// Also verify each group has a valid latestDate (> 0)
			for (const g of groups) {
				expect(g.latestDate).toBeGreaterThan(0);
			}
		});

		it("should produce stable keys: imageHash for groups, solo-session for unhashed", () => {
			let tick = 10000;
			vi.spyOn(Date, "now").mockImplementation(() => tick++);
			saveSession({ thumbnail: "x", analysis: mockAnalysis, copy: mockCopy, imageHash: "hashX" });
			saveSession({ thumbnail: "y", analysis: mockAnalysis, copy: mockCopy }); // solo, no hash
			vi.restoreAllMocks();

			const groups = groupSessionsByImage(getSessions());
			const hashedGroup = groups.find((g) => g.imageHash === "hashX");
			const soloGroup = groups.find((g) => g.imageHash === null);

			expect(hashedGroup).toBeDefined();
			expect(hashedGroup!.sessions.length).toBe(1);
			expect(soloGroup).toBeDefined();
			expect(soloGroup!.sessions.length).toBe(1);
		});
	});
});
